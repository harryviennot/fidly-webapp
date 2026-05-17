'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  CaretDownIcon,
  CheckIcon,
  DeviceMobileIcon,
  DownloadSimpleIcon,
  FilePdfIcon,
} from '@phosphor-icons/react';
import { Card } from '@/components/ui/card';
import { InfoBox } from '@/components/reusables/info-box';
import { useBusiness } from '@/contexts/business-context';
import { useAuth } from '@/contexts/auth-provider';
import { useIsMobileDevice } from '@/hooks/use-mobile-device';
import { getBusinessSignupQR } from '@/api/businesses';
import { createPublicCustomer } from '@/api/customers';
import { QRCodeSkeleton } from '@/components/ui/qr-code-skeleton';
import { downloadQrPng, downloadQrPdf } from '@/lib/qr-download';
import { copyToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';
import { useBusinessInstalls } from './useBusinessInstalls';

// 3s gives the owner time to see the "Card installed" success state land
// before the wizard advances. Shorter than this felt like a yank — the green
// confirmation barely had time to register.
const AUTO_ADVANCE_DELAY_MS = 3000;
const NEXT_STEP_PATH = '/onboarding/business/first-stamp/stamp';

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
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const { completeWithPayload, uncompleteStep, isStepCompleted } = useWizardProgress();
  const ctx = useWizardStep();

  const businessId = currentBusiness?.id;
  const slug = currentBusiness?.url_slug;
  const businessName = currentBusiness?.name ?? 'business';
  const showcaseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || 'https://stampeo.app';
  const signupUrl = useMemo(() => `${showcaseUrl}/${slug ?? ''}`, [showcaseUrl, slug]);

  const { installedCount, loading: installsLoading } = useBusinessInstalls(businessId);

  const [qrCode, setQrCode] = useState<string | null>(null);
  // Transient state for the just-tapped quick-install: the wallet links the
  // user needs to actually open Apple/Google Wallet. Cleared once an
  // installed pass shows up in `installedCount`.
  const [install, setInstall] = useState<InstallUrls>({});
  const [registering, setRegistering] = useState(false);
  const [copied, setCopied] = useState(false);
  // When ≥1 device is installed, the install UI collapses behind a CTA.
  // Toggling this re-exposes it so the owner can install on another phone.
  const [showInstallAnother, setShowInstallAnother] = useState(false);

  const ownerName = (user?.user_metadata?.name as string | undefined) ?? '';
  const ownerEmail = user?.email ?? '';
  const ownerPhone = (user?.user_metadata?.phone as string | undefined) ?? '';

  const stepCompleted = isStepCompleted({ chapter: 'first-stamp', step: 'install' });
  // Snapshot at mount so the auto-advance effect doesn't yank the owner
  // out of the page on back-navigation. Only the *first* time they hit
  // the installed state in a given mount should we advance.
  const completedOnEntryRef = useRef(stepCompleted);

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

  // ── Auto-advance when we cross from 0 → ≥1 in this mount ────────────
  useEffect(() => {
    if (completedOnEntryRef.current) return;
    if (installedCount < 1) return;
    const id = setTimeout(() => router.push(NEXT_STEP_PATH), AUTO_ADVANCE_DELAY_MS);
    return () => clearTimeout(id);
  }, [installedCount, router]);

  useEffect(() => {
    ctx.setCanSkip(true);
  }, [ctx]);

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
      setShowInstallAnother(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
    } finally {
      setRegistering(false);
    }
  }, [businessId, ownerName, ownerEmail, ownerPhone, tErr]);

  const hasInstalls = installedCount >= 1;
  // When we already have installs, hide the install UI behind the
  // "install on another device" toggle to keep the page calm. Always
  // expose it when there are zero installs.
  const showInstallUi = !hasInstalls || showInstallAnother || !!install.passUrl;
  const actionCopy = isMobileDevice
    ? t('explanationActionMobile')
    : t('explanationActionDesktop');

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {hasInstalls && (
        <InstalledSummaryCard
          count={installedCount}
          showInstallAnother={showInstallAnother}
          onToggleInstallAnother={() => setShowInstallAnother((v) => !v)}
          t={t}
        />
      )}

      {showInstallUi && (
        <>
          {!hasInstalls && (
            <>
              <p className="wiz-body text-[var(--foreground)] leading-relaxed">{t('explanation')}</p>
              <p className="wiz-body text-[var(--foreground)] leading-relaxed">{actionCopy}</p>
            </>
          )}

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
        </>
      )}

      {hasInstalls && !completedOnEntryRef.current && (
        <InfoBox variant="success" message={t('detected')} />
      )}
    </div>
  );
}

interface InstalledSummaryCardProps {
  count: number;
  showInstallAnother: boolean;
  onToggleInstallAnother: () => void;
  t: ReturnType<typeof useTranslations>;
}

function InstalledSummaryCard({
  count,
  showInstallAnother,
  onToggleInstallAnother,
  t,
}: InstalledSummaryCardProps) {
  return (
    <Card
      hover={false}
      className="border-[var(--accent-200)] bg-[var(--accent-light)]/40 p-4 flex items-center justify-between gap-3 flex-wrap"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center">
          <CheckIcon className="w-5 h-5 text-white" weight="bold" />
        </span>
        <p className="wiz-body font-medium text-[var(--foreground)]">
          {t('installedSummary', { count })}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggleInstallAnother}
        className="wiz-helper font-semibold text-[var(--accent)] hover:underline"
      >
        {showInstallAnother ? t('qrHide') : t('installAnotherCta')}
      </button>
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
