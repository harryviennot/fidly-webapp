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
  Spinner as SpinnerIcon,
} from '@phosphor-icons/react';
import { Card } from '@/components/ui/card';
import { InfoBox } from '@/components/reusables/info-box';
import { useBusiness } from '@/contexts/business-context';
import { useAuth } from '@/contexts/auth-provider';
import { useIsMobileDevice } from '@/hooks/use-mobile-device';
import { getBusinessSignupQR } from '@/api/businesses';
import {
  createPublicCustomer,
  enrollmentIdFromPassUrl,
  getCustomer,
} from '@/api/customers';
import { createClient } from '@/utils/supabase/client';
import { QRCodeSkeleton } from '@/components/ui/qr-code-skeleton';
import { downloadQrPng, downloadQrPdf } from '@/lib/qr-download';
import { copyToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';
import type { RealtimeChannel } from '@supabase/supabase-js';

const WATCH_TIMEOUT_MS = 5 * 60 * 1000;
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
 * Chapter 8 sub-step 1 — "Take it for a spin".
 *
 * The customer-flow narrative drives the layout: we show the public signup
 * URL + QR so the owner can walk the same path their customers will. On a
 * touch device we also expose a "Just want the card?" quick-install that
 * registers the owner directly from their account info.
 *
 * Detection is realtime-based (Supabase `postgres_changes`) — no polling:
 *   - Phase A: subscribe to INSERT on `customers` filtered by business_id.
 *     On hit, fetch the customer once to pull the enrollment_id (enrollments
 *     isn't readable to members, so we go through the API).
 *   - Phase B: subscribe to INSERT on `push_registrations` filtered by the
 *     detected customer_id. First Apple/Google registration → step complete.
 *
 * A 5-minute timeout closes both channels so a forgotten tab doesn't hold a
 * websocket open forever. The user gets a "Still here?" retry card.
 *
 * Device-flow split is touch/pointer-based, not viewport-based, so a narrow
 * desktop browser still sees the desktop UX (Apple/Google Wallet aren't
 * installable on desktop OSes).
 */
export function InstallStep() {
  const t = useTranslations('onboardingBusiness.chapters.first-stamp.steps.install');
  const tErr = useTranslations('onboardingBusiness.errors');
  const locale = useLocale();
  const isMobileDevice = useIsMobileDevice();
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const { progress, completeWithPayload, updatePayload } = useWizardProgress();
  const ctx = useWizardStep();

  const businessId = currentBusiness?.id;
  const slug = currentBusiness?.url_slug;
  const businessName = currentBusiness?.name ?? 'business';
  const showcaseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || 'https://stampeo.app';
  const signupUrl = useMemo(() => `${showcaseUrl}/${slug ?? ''}`, [showcaseUrl, slug]);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [install, setInstall] = useState<InstallUrls>({});
  const [registering, setRegistering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [watchTick, setWatchTick] = useState(0);

  const ownerName = (user?.user_metadata?.name as string | undefined) ?? '';
  const ownerEmail = user?.email ?? '';
  const ownerPhone = (user?.user_metadata?.phone as string | undefined) ?? '';

  const customerId = progress.payload.demo_customer_id;
  const alreadyCompleted = progress.completed.some(
    (s) => s.chapter === 'first-stamp' && s.step === 'install'
  );

  // Snapshot of `alreadyCompleted` at mount. If the owner navigates *back*
  // into a step they previously finished, the auto-advance effect would
  // re-fire instantly and they'd never get to see the screen again. We only
  // auto-advance when completion happens *during this mount*, i.e. the owner
  // installed the card just now.
  const completedOnEntryRef = useRef(alreadyCompleted);

  // ── QR fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    getBusinessSignupQR(businessId)
      .then((data) => setQrCode(data.qr_code))
      .catch(() => { /* skeleton stays */ });
  }, [businessId]);

  // ── Phase A: realtime customer detection ────────────────────────────
  // Subscribe to INSERTs on `customers` filtered by business_id. When a row
  // arrives we fetch it via the API (enrollments isn't member-readable, so
  // we can't read enrollment_id from the realtime payload alone).
  useEffect(() => {
    if (!businessId || customerId || alreadyCompleted || timedOut) return;

    const supabase = createClient();
    let cancelled = false;

    const channel: RealtimeChannel = supabase
      .channel(`onboarding-install-${businessId}-${watchTick}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customers',
          filter: `business_id=eq.${businessId}`,
        },
        async (payload) => {
          if (cancelled) return;
          const inserted = payload.new as { id?: string };
          if (!inserted?.id) return;
          try {
            const customer = await getCustomer(businessId, inserted.id);
            if (cancelled) return;
            const enrollmentId = customer.enrollments?.[0]?.id;
            if (!enrollmentId) return;
            await updatePayload({
              demo_customer_id: customer.id,
              demo_enrollment_id: enrollmentId,
            });
          } catch {
            // Insert without enrollment yet → next realtime event on
            // push_registrations will re-trigger via the customerId effect
            // once the enrollment lands. Worst case the user can refresh.
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [businessId, customerId, alreadyCompleted, timedOut, watchTick, updatePayload]);

  // ── Phase B: realtime wallet-install detection ──────────────────────
  // Once we have a customer_id, watch push_registrations for the first row
  // matching it. Any row (apple OR google) means the pass is installed.
  useEffect(() => {
    if (!businessId || !customerId || alreadyCompleted || timedOut) return;

    const supabase = createClient();
    let resolved = false;

    const finish = async () => {
      if (resolved) return;
      resolved = true;
      await completeWithPayload({ chapter: 'first-stamp', step: 'install' }, {});
    };

    const channel: RealtimeChannel = supabase
      .channel(`onboarding-install-wallet-${customerId}-${watchTick}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'push_registrations',
          filter: `customer_id=eq.${customerId}`,
        },
        () => { void finish(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, customerId, alreadyCompleted, timedOut, watchTick, completeWithPayload]);

  // ── 5-minute watch timeout ──────────────────────────────────────────
  // Hard stop after 5 min so a forgotten tab doesn't hold a websocket open
  // indefinitely. The "Retry" button bumps watchTick which re-subscribes
  // both channels and resets the timer.
  useEffect(() => {
    if (alreadyCompleted || timedOut) return;
    const id = setTimeout(() => setTimedOut(true), WATCH_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [alreadyCompleted, timedOut, watchTick]);

  // ── Auto-advance when fully done ────────────────────────────────────
  // Only when the owner completes the step in this session — never on
  // back-navigation (see `completedOnEntryRef`).
  useEffect(() => {
    if (completedOnEntryRef.current) return;
    if (!alreadyCompleted) return;
    const id = setTimeout(() => router.push(NEXT_STEP_PATH), AUTO_ADVANCE_DELAY_MS);
    return () => clearTimeout(id);
  }, [alreadyCompleted, router]);

  const handleRetry = useCallback(() => {
    setTimedOut(false);
    setWatchTick((n) => n + 1);
  }, []);

  const handleManualConfirm = useCallback(async () => {
    if (!customerId) return;
    await completeWithPayload({ chapter: 'first-stamp', step: 'install' }, {});
  }, [customerId, completeWithPayload]);

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
      const enrollmentId = enrollmentIdFromPassUrl(response.pass_url);
      await updatePayload({
        demo_customer_id: response.customer_id,
        demo_enrollment_id: enrollmentId ?? undefined,
      });
      setInstall({ passUrl: response.pass_url, googleWalletUrl: response.google_wallet_url });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
    } finally {
      setRegistering(false);
    }
  }, [businessId, ownerName, ownerEmail, ownerPhone, updatePayload, tErr]);

  const customerDetected = !!customerId;
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

      {isMobileDevice && !install.passUrl && !customerDetected && (
        <QuickInstallCard
          registering={registering}
          onInstall={handleQuickInstall}
          t={t}
        />
      )}

      {isMobileDevice && install.passUrl && !alreadyCompleted && (
        <WalletInstallCard
          passUrl={install.passUrl}
          googleWalletUrl={install.googleWalletUrl}
          locale={locale}
          t={t}
        />
      )}

      {alreadyCompleted ? (
        <DetectedCard returning={completedOnEntryRef.current} t={t} />
      ) : timedOut ? (
        <TimeoutCard onRetry={handleRetry} t={t} />
      ) : customerDetected ? (
        <WatchingCard onManualConfirm={handleManualConfirm} t={t} />
      ) : (
        <PollingHintCard t={t} />
      )}
    </div>
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

interface StatusCardProps {
  t: ReturnType<typeof useTranslations>;
}

function PollingHintCard({ t }: StatusCardProps) {
  return (
    <Card hover={false} className="bg-[var(--paper)] px-4 py-3 flex items-center gap-3">
      <SpinnerIcon className="w-4 h-4 text-[var(--accent)] flex-shrink-0 animate-spin" weight="bold" />
      <p className="wiz-helper text-[#555]">{t('pollingHint')}</p>
    </Card>
  );
}

interface WatchingCardProps extends StatusCardProps {
  onManualConfirm: () => void;
}

function WatchingCard({ onManualConfirm, t }: WatchingCardProps) {
  return (
    <Card
      hover={false}
      className="border-[var(--accent-200)] bg-[var(--accent-light)]/40 p-4 flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <SpinnerIcon className="w-4 h-4 text-[var(--accent)] flex-shrink-0 animate-spin" weight="bold" />
        <p className="wiz-body-sm font-medium text-[var(--foreground)]">{t('watchingInstall')}</p>
      </div>
      <button
        type="button"
        onClick={onManualConfirm}
        className="wiz-helper text-[var(--accent)] hover:underline self-start"
      >
        {t('manualConfirmCta')}
      </button>
    </Card>
  );
}

interface DetectedCardProps extends StatusCardProps {
  /** True when the step was already completed at mount (back-nav). In that
   *  case we drop "moving on in a moment" — there is no auto-advance and
   *  promising one would be misleading. */
  returning: boolean;
}

function DetectedCard({ returning, t }: DetectedCardProps) {
  return (
    <InfoBox
      variant="success"
      message={t(returning ? 'detectedReturning' : 'detected')}
    />
  );
}

interface TimeoutCardProps extends StatusCardProps {
  onRetry: () => void;
}

function TimeoutCard({ onRetry, t }: TimeoutCardProps) {
  return (
    <Card hover={false} className="bg-[var(--paper)] p-4 flex flex-col gap-3">
      <div>
        <p className="wiz-body font-semibold text-[var(--foreground)]">{t('timeoutTitle')}</p>
        <p className="wiz-helper text-[#555] leading-relaxed mt-0.5">{t('timeoutBody')}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="self-start inline-flex items-center gap-1.5 rounded-[10px] bg-[var(--accent)] px-4 py-2.5 wiz-body-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors min-h-[40px]"
      >
        {t('retry')}
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
