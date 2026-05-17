'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  CaretDownIcon,
  CheckIcon,
  DeviceMobileIcon,
  DownloadSimpleIcon,
  FilePdfIcon,
  Spinner as SpinnerIcon,
} from '@phosphor-icons/react';
import { Card } from '@/components/ui/card';
import { useBusiness } from '@/contexts/business-context';
import { useAuth } from '@/contexts/auth-provider';
import { useIsMobileDevice } from '@/hooks/use-mobile-device';
import { getBusinessSignupQR } from '@/api/businesses';
import { createPublicCustomer } from '@/api/customers';
import { activateDesign } from '@/api/designs';
import { QRCodeSkeleton } from '@/components/ui/qr-code-skeleton';
import { downloadQrPng, downloadQrPdf } from '@/lib/qr-download';
import { copyToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { useDesigns, designKeys } from '@/hooks/use-designs';
import type { CardDesign } from '@/types';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';
import { useBusinessInstalls } from './useBusinessInstalls';
import { useDesignReady } from './useDesignReady';

interface InstallUrls {
  passUrl?: string;
  googleWalletUrl?: string;
}

/**
 * Chapter 7 sub-step 1 — "Take it for a spin".
 *
 * The customer-flow narrative drives the layout: we show the public signup
 * URL + QR so the owner can walk the same path their customers will. On a
 * touch device we also expose a "Just want the card?" quick-install that
 * registers the owner directly from their account info.
 *
 * State model:
 *   - `useBusinessInstalls(businessId)` is the source of truth for which
 *     customers exist and whether their pass is currently installed (i.e.
 *     has at least one `push_registrations` row). It subscribes to
 *     realtime so external installs (QR scan from another device) show up
 *     without a refresh.
 *   - `step.completed` is *derived* from `installedCount >= 1`. If every
 *     pass is removed (registrations all gone), the step un-completes so
 *     the owner can re-install.
 *   - The wizard does NOT pin a single "demo customer" — every customer
 *     this business has is treated as a real install. Multi-device just
 *     adds more rows; nothing is overwritten or orphaned.
 */
export function InstallStep() {
  const t = useTranslations('onboardingBusiness.chapters.first-stamp.steps.install');
  const tErr = useTranslations('onboardingBusiness.errors');
  const locale = useLocale();
  const isMobileDevice = useIsMobileDevice();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const { completeWithPayload, uncompleteStep, isStepCompleted } = useWizardProgress();
  const ctx = useWizardStep();

  const businessId = currentBusiness?.id;
  const slug = currentBusiness?.url_slug;
  const businessName = currentBusiness?.name ?? 'business';
  const showcaseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || 'https://stampeo.app';
  const signupUrl = useMemo(() => `${showcaseUrl}/${slug ?? ''}`, [showcaseUrl, slug]);

  // The wizard creates exactly one design in BrandingStep, so designs[0] is
  // always the row we activate at install time. Both `useDesigns` and
  // `useDesignReady` read the same cache key; the realtime hook mirrors
  // backend UPDATEs into it so `is_active` and `strip_status` stay fresh
  // without a manual refetch. We pass `wizardDesign` straight into
  // `useDesignReady` as its initial seed so a remount whose cache is already
  // hot skips the loader on the very first paint (avoids the one-frame
  // "loader → install" flash that would otherwise happen while the hook's
  // internal `getDesign` is in flight).
  const { data: designs = [] } = useDesigns(businessId);
  const wizardDesign = designs[0];
  const designId = wizardDesign?.id;
  const { ready: designReady, isActive } = useDesignReady(
    businessId,
    designId,
    wizardDesign
  );

  const { installedCount, loading: installsLoading } = useBusinessInstalls(businessId);

  const [qrCode, setQrCode] = useState<string | null>(null);
  // Transient state for the just-tapped quick-install: the wallet links the
  // user needs to actually open Apple/Google Wallet. Cleared once an
  // installed pass shows up in `installedCount`.
  const [install, setInstall] = useState<InstallUrls>({});
  const [registering, setRegistering] = useState(false);
  const [copied, setCopied] = useState(false);

  const ownerName = (user?.user_metadata?.name as string | undefined) ?? '';
  const ownerEmail = user?.email ?? '';
  const ownerPhone = (user?.user_metadata?.phone as string | undefined) ?? '';

  const stepCompleted = isStepCompleted({ chapter: 'first-stamp', step: 'install' });

  // ── QR fetch ────────────────────────────────────────────────────────
  // Pass the browser-side `signupUrl` so the QR encodes the exact same
  // string we display next to it. The backend default would use its own
  // `settings.showcase_url`, which in dev (nip.io subdomains) doesn't
  // match the browser-side `NEXT_PUBLIC_SHOWCASE_URL`.
  useEffect(() => {
    if (!businessId) return;
    getBusinessSignupQR(businessId, signupUrl)
      .then((data) => setQrCode(data.qr_code))
      .catch(() => { /* skeleton stays */ });
  }, [businessId, signupUrl]);

  // ── Derive completion from installedCount ──────────────────────────
  // Single direction: installedCount drives stepCompleted, not vice versa.
  // We wait for the initial install fetch to finish to avoid uncompleting
  // a real install during the loading window between mount and first
  // refetch.
  useEffect(() => {
    if (installsLoading) return;
    if (installedCount >= 1 && !stepCompleted) {
      void completeWithPayload({ chapter: 'first-stamp', step: 'install' }, {});
    } else if (installedCount === 0 && stepCompleted) {
      void uncompleteStep({ chapter: 'first-stamp', step: 'install' });
    }
  }, [installedCount, installsLoading, stepCompleted, completeWithPayload, uncompleteStep]);

  // ── Clear transient install URLs once we see an actual install ──────
  // Otherwise the "Add to Wallet" buttons linger forever on mobile.
  useEffect(() => {
    if (installedCount >= 1 && install.passUrl) setInstall({});
  }, [installedCount, install.passUrl]);

  useEffect(() => {
    ctx.setCanSkip(true);
  }, [ctx]);

  // Activation is deferred from BackStep to here — it requires strips to be
  // ready (the backend returns 400 otherwise). Fire activate exactly once
  // per (businessId, designId) once strips finish rendering. `activatingRef`
  // guards against React Strict Mode's double-invoke and any rapid
  // re-renders during the brief window before the response writes back into
  // the cache.
  const activatingRef = useRef<string | null>(null);
  useEffect(() => {
    if (!businessId || !designId || !designReady || isActive) return;
    if (activatingRef.current === designId) return;
    activatingRef.current = designId;
    (async () => {
      try {
        const activated = await activateDesign(businessId, designId);
        queryClient.setQueryData<CardDesign[]>(
          designKeys.all(businessId),
          (prev) => {
            if (!prev) return [activated];
            return prev.map((d) => (d.id === designId ? activated : d));
          }
        );
      } catch (err) {
        // Surface the error but don't block — the user can retry by going
        // back to BackStep or refreshing. Reset the ref so a later effect
        // re-run (e.g. after a manual navigation) can try again.
        activatingRef.current = null;
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
      }
    })();
  }, [businessId, designId, designReady, isActive, queryClient, tErr]);

  // Loader gates solely on strip readiness. We intentionally do NOT block on
  // `isActive` here — activation runs in the background via the effect above
  // and the activate API completes in a few hundred ms, so the install UI
  // can render immediately once strips are ready. Gating on isActive caused
  // a stuck-loader bug: the backend's `set_active` two-step (deactivate-all
  // then activate-one) emits a transient is_active=false realtime event, and
  // missing the follow-up event would trap the page in the loader until a
  // hard refresh.
  const cardReady = designReady;

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(signupUrl);
      setCopied(true);
      toast.success(t('copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(tErr('saveFailed'));
    }
  }, [signupUrl, t, tErr]);

  const handleQuickInstall = useCallback(async () => {
    if (!businessId) return;
    setRegistering(true);
    try {
      const response = await createPublicCustomer(businessId, {
        name: ownerName || undefined,
        email: ownerEmail || undefined,
        phone: ownerPhone || undefined,
      });
      if (!response.customer_id || !response.pass_url) {
        toast.error(tErr('saveFailed'));
        return;
      }
      setInstall({ passUrl: response.pass_url, googleWalletUrl: response.google_wallet_url });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
    } finally {
      setRegistering(false);
    }
  }, [businessId, ownerName, ownerEmail, ownerPhone, tErr]);

  const hasInstalls = installedCount >= 1;
  const actionCopy = isMobileDevice
    ? t('explanationActionMobile')
    : t('explanationActionDesktop');

  if (!cardReady) {
    return <CardReadyLoader t={t} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <p className="wiz-body text-[var(--foreground)] leading-relaxed">{t('explanation')}</p>
      <p className="wiz-body text-[var(--foreground)] leading-relaxed">{actionCopy}</p>

      <SignupUrlCard url={signupUrl} copied={copied} onCopy={handleCopy} t={t} />

      <QrCard
        qrCode={qrCode}
        signupUrl={signupUrl}
        businessName={businessName}
        collapsedByDefault={isMobileDevice}
        t={t}
      />

      {isMobileDevice && !install.passUrl && (
        <QuickInstallCard
          registering={registering}
          onInstall={handleQuickInstall}
          t={t}
        />
      )}

      {isMobileDevice && install.passUrl && (
        <WalletInstallCard
          passUrl={install.passUrl}
          googleWalletUrl={install.googleWalletUrl}
          locale={locale}
          t={t}
        />
      )}

      {/* Listener feedback / installed confirmation at the bottom.
          Once ≥1 device has the pass we swap in the success summary, but
          keep all of the instructional content above visible so adding
          another device is a continuation of the same screen rather than a
          context-switch behind a CTA. */}
      {hasInstalls ? (
        <InstalledSummaryCard count={installedCount} t={t} />
      ) : install.passUrl ? (
        <WatchingCard t={t} />
      ) : (
        <PollingHintCard t={t} />
      )}

    </div>
  );
}

interface StatusCardProps {
  t: ReturnType<typeof useTranslations>;
}

/**
 * Renders while `strip_status === 'regenerating'` on the wizard's design.
 * Replaces the install UI with a calm "preparing your card" state: an
 * accent-coloured card silhouette pulses behind a centred spinner, with a
 * title + subtitle that explain what's happening. Realtime takes care of
 * dismissing this — the parent flips `cardReady` to true the moment the
 * backend posts the UPDATE that sets strip_status back to 'ready'.
 */
function CardReadyLoader({ t }: StatusCardProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <header className="flex flex-col gap-1 text-center">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('loadingTitle')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('loadingSubtitle')}</p>
      </header>

      <div className="relative w-full max-w-[320px] aspect-[1.586/1]">
        {/* Card silhouette pulses in the accent colour so it visually
            mirrors the design the user just configured, without us having
            to thread the actual CardDesign through here. */}
        <div className="absolute inset-0 rounded-2xl bg-[var(--accent-light)] animate-pulse" />
        <div
          className="absolute inset-0 rounded-2xl border border-[var(--accent-200)] opacity-60"
          aria-hidden="true"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-[var(--accent)] shadow-lg">
            <SpinnerIcon
              className="w-7 h-7 text-white animate-spin"
              weight="bold"
            />
          </span>
        </div>
      </div>

      <p className="wiz-helper text-[#999] text-center max-w-[280px]">
        {t('loadingHint')}
      </p>
    </div>
  );
}

function PollingHintCard({ t }: StatusCardProps) {
  return (
    <Card hover={false} className="bg-[var(--paper)] px-4 py-3 flex items-center gap-3">
      <SpinnerIcon className="w-4 h-4 text-[var(--accent)] flex-shrink-0 animate-spin" weight="bold" />
      <p className="wiz-helper text-[#555]">{t('pollingHint')}</p>
    </Card>
  );
}

function WatchingCard({ t }: StatusCardProps) {
  return (
    <Card
      hover={false}
      className="border-[var(--accent-200)] bg-[var(--accent-light)]/40 p-4 flex items-center gap-3"
    >
      <SpinnerIcon className="w-4 h-4 text-[var(--accent)] flex-shrink-0 animate-spin" weight="bold" />
      <p className="wiz-body-sm font-medium text-[var(--foreground)]">{t('watchingInstall')}</p>
    </Card>
  );
}

interface InstalledSummaryCardProps {
  count: number;
  t: ReturnType<typeof useTranslations>;
}

function InstalledSummaryCard({ count, t }: InstalledSummaryCardProps) {
  return (
    <Card
      hover={false}
      className="border-[var(--accent-200)] bg-[var(--accent-light)]/40 p-4 flex items-center gap-3"
    >
      <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center">
        <CheckIcon className="w-5 h-5 text-white" weight="bold" />
      </span>
      <p className="wiz-body font-medium text-[var(--foreground)]">
        {t('installedSummary', { count })}
      </p>
    </Card>
  );
}

interface SignupUrlCardProps {
  url: string;
  copied: boolean;
  onCopy: () => void;
  t: ReturnType<typeof useTranslations>;
}

function SignupUrlCard({ url, copied, onCopy, t }: SignupUrlCardProps) {
  return (
    <Card hover={false} className="px-4 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="wiz-micro uppercase tracking-wider text-[#999] font-medium mb-0.5">
          {t('signupUrlLabel')}
        </p>
        <p className="wiz-body-sm font-mono text-[var(--foreground)] truncate">{url}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          'flex-shrink-0 px-4 py-2.5 rounded-lg border wiz-helper font-semibold cursor-pointer flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap',
          copied
            ? 'bg-[var(--accent-light)] border-[var(--accent-light)] text-[var(--accent)]'
            : 'bg-white border-[var(--border-medium)] text-[#555] hover:bg-[var(--paper)]'
        )}
      >
        {copied ? (
          <>
            <CheckIcon className="w-3.5 h-3.5" /> {t('copied')}
          </>
        ) : (
          t('copy')
        )}
      </button>
    </Card>
  );
}

interface QrCardProps {
  qrCode: string | null;
  signupUrl: string;
  businessName: string;
  collapsedByDefault: boolean;
  t: ReturnType<typeof useTranslations>;
}

function QrCard({ qrCode, signupUrl, businessName, collapsedByDefault, t }: QrCardProps) {
  const [expanded, setExpanded] = useState(!collapsedByDefault);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    setExpanded(!collapsedByDefault);
  }, [collapsedByDefault]);

  const handlePng = useCallback(() => {
    if (!qrCode) return;
    downloadQrPng(qrCode, businessName);
  }, [qrCode, businessName]);

  const handlePdf = useCallback(async () => {
    if (!qrCode || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadQrPdf(qrCode, businessName, signupUrl);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setPdfBusy(false);
    }
  }, [qrCode, businessName, signupUrl, pdfBusy]);

  return (
    <Card hover={false} className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="wiz-body font-semibold text-[var(--foreground)]">{t('qrTitle')}</p>
          <p className="wiz-helper text-[#7A7A7A] leading-relaxed mt-0.5">{t('qrBody')}</p>
        </div>
        {collapsedByDefault && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex-shrink-0 inline-flex items-center gap-1 rounded-[8px] border border-[var(--border)] px-2.5 py-2 wiz-helper font-semibold hover:bg-[var(--paper-hover)] transition-colors min-h-[36px]"
            aria-expanded={expanded}
          >
            <CaretDownIcon
              className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')}
              weight="bold"
            />
            {expanded ? t('qrHide') : t('qrShow')}
          </button>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col items-center gap-3 pt-1">
          {qrCode ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCode} alt="signup QR" className="w-[200px] h-[200px]" />
          ) : (
            <QRCodeSkeleton size={200} />
          )}
        </div>
      )}

      {/* Quick actions — always visible so a mobile owner can grab the QR
          for the counter without expanding it first. */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePng}
          disabled={!qrCode}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-white px-3 py-2 wiz-helper font-semibold text-[var(--foreground)] hover:bg-[var(--paper-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
        >
          <DownloadSimpleIcon className="w-3.5 h-3.5" weight="bold" />
          {t('downloadPng')}
        </button>
        <button
          type="button"
          onClick={handlePdf}
          disabled={!qrCode || pdfBusy}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-white px-3 py-2 wiz-helper font-semibold text-[var(--foreground)] hover:bg-[var(--paper-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
        >
          <FilePdfIcon className="w-3.5 h-3.5" weight="bold" />
          {t('downloadPdf')}
        </button>
      </div>
    </Card>
  );
}

interface QuickInstallCardProps {
  registering: boolean;
  onInstall: () => void;
  t: ReturnType<typeof useTranslations>;
}

function QuickInstallCard({ registering, onInstall, t }: QuickInstallCardProps) {
  return (
    <Card hover={false} className="p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
          <DeviceMobileIcon className="w-5 h-5 text-[var(--accent)]" weight="bold" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="wiz-body font-semibold text-[var(--foreground)]">{t('quickInstallTitle')}</p>
          <p className="wiz-helper text-[#7A7A7A] leading-relaxed mt-0.5">
            {t('quickInstallBody')}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onInstall}
        disabled={registering}
        className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-[var(--accent)] px-4 py-3 wiz-body font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60 min-h-[48px]"
      >
        {registering ? t('registering') : t('quickInstallCta')}
      </button>
    </Card>
  );
}

interface WalletInstallCardProps {
  passUrl: string;
  googleWalletUrl?: string;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}

function WalletInstallCard({ passUrl, googleWalletUrl, locale, t }: WalletInstallCardProps) {
  const appleSrc = locale === 'fr' ? '/AppleWalletFR.svg' : '/AppleWallet.svg';
  const googleSrc = locale === 'fr' ? '/GoogleWalletFR.svg' : '/GoogleWallet.svg';

  return (
    <Card hover={false} className="p-5 flex flex-col gap-3 items-center">
      <p className="wiz-body font-semibold text-[var(--foreground)] text-center">{t('installTitle')}</p>
      <p className="wiz-helper text-[#7A7A7A] text-center max-w-[320px] leading-relaxed">
        {t('installBody')}
      </p>
      <div className="flex flex-row flex-wrap items-center justify-center gap-3 py-1">
        <a href={passUrl} className="block hover:opacity-90 transition-opacity">
          <Image
            src={appleSrc}
            alt={t('addToAppleWallet')}
            width={200}
            height={50}
            className="h-[50px] w-auto"
          />
        </a>
        {googleWalletUrl && (
          <a
            href={googleWalletUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:opacity-90 transition-opacity"
          >
            <Image
              src={googleSrc}
              alt={t('addToGoogleWallet')}
              width={200}
              height={50}
              className="h-[50px] w-auto"
            />
          </a>
        )}
      </div>
    </Card>
  );
}
