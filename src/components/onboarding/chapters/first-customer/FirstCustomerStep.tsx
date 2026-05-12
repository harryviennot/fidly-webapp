'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { toast } from 'sonner';
import { Check, CheckCircle, Copy, DeviceMobile, QrCode, Spinner } from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { useAuth } from '@/contexts/auth-provider';
import { useIsMobile } from '@/hooks/use-mobile';
import { getBusinessSignupQR } from '@/api/businesses';
import {
  createPublicCustomer,
  enrollmentIdFromPassUrl,
  getCustomerWalletStatus,
  getCustomers,
} from '@/api/customers';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';

const POLL_INTERVAL_MS = 2000;
const AUTO_ADVANCE_DELAY_MS = 1200;
const NEXT_STEP_PATH = '/onboarding/business/live-stamp';

interface InstallUrls {
  passUrl?: string;
  googleWalletUrl?: string;
}

/**
 * Chapter 7 — optional. Two paths to the same outcome (`demo_customer_id` +
 * `demo_enrollment_id` set in setup_progress.payload):
 *
 * - **Desktop**: shows the public signup URL + QR. Owner scans / shares it,
 *   a customer registers via showcase, the wizard's background poller picks
 *   them up.
 * - **Mobile**: same explanation + URL, plus a "Quick install — use my info"
 *   button that calls /public/customers directly and shows the Apple +
 *   Google Wallet install buttons inline.
 *
 * In both cases a background poller watches the customer list for new
 * entries since this step opened — whichever path the owner takes, we
 * detect the resulting customer and store its id + enrollment id.
 */
export function FirstCustomerStep() {
  const t = useTranslations('onboardingBusiness.chapters.first-customer');
  const tErr = useTranslations('onboardingBusiness.errors');
  const locale = useLocale();
  const isMobile = useIsMobile();
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const { progress, completeWithPayload, updatePayload } = useWizardProgress();
  const ctx = useWizardStep();

  const businessId = currentBusiness?.id;
  const slug = currentBusiness?.url_slug;
  const showcaseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || 'https://stampeo.app';
  const signupUrl = useMemo(() => `${showcaseUrl}/${slug ?? ''}`, [showcaseUrl, slug]);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [install, setInstall] = useState<InstallUrls>({});
  const [registering, setRegistering] = useState(false);
  const [copied, setCopied] = useState(false);

  const ownerName = (user?.user_metadata?.name as string | undefined) ?? '';
  const ownerEmail = user?.email ?? '';
  const ownerPhone = (user?.user_metadata?.phone as string | undefined) ?? '';

  // Fetch the QR once on desktop. Skipped on mobile to save a round trip.
  useEffect(() => {
    if (isMobile || !businessId) return;
    getBusinessSignupQR(businessId)
      .then((data) => setQrCode(data.qr_code))
      .catch(() => { /* QR stays null; skeleton renders */ });
  }, [isMobile, businessId]);

  // Snapshot existing customer ids so we can tell "new since this step opened"
  // from "already existed." Either the owner self-installs via the Quick
  // Install button (which adds 1 customer) or someone registers through the
  // public signup page (also adds 1). The freshest unseen id wins.
  const initialIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!businessId || initialIdsRef.current !== null) return;
    getCustomers(businessId, 100, 0)
      .then((res) => {
        initialIdsRef.current = new Set(res.data.map((c) => c.id));
      })
      .catch(() => {
        initialIdsRef.current = new Set();
      });
  }, [businessId]);

  // ── Phase A: detect new customer signup ──────────────────────────────
  // Watch the customer list for any new id since the step mounted. Writes
  // demo_customer_id + demo_enrollment_id via `updatePayload` (no completion
  // yet — the step is only "done" once the wallet pass is actually installed,
  // detected in Phase B below).
  const customerDetectedRef = useRef(false);
  useEffect(() => {
    if (!businessId) return;
    if (progress.payload.demo_customer_id) {
      customerDetectedRef.current = true;
      return;
    }
    let cancelled = false;

    const tick = async () => {
      if (initialIdsRef.current === null || customerDetectedRef.current) return;
      try {
        const res = await getCustomers(businessId, 20, 0);
        if (cancelled || customerDetectedRef.current) return;
        const unseen = res.data.find((c) => !initialIdsRef.current!.has(c.id));
        if (!unseen) return;
        const enrollmentId = unseen.enrollments?.[0]?.id;
        if (!enrollmentId) return; // enrollment lag — retry next tick
        customerDetectedRef.current = true;
        await updatePayload({
          demo_customer_id: unseen.id,
          demo_enrollment_id: enrollmentId,
        });
      } catch {
        // ignore; retry next tick
      }
    };

    const interval = setInterval(tick, POLL_INTERVAL_MS);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [businessId, progress.payload.demo_customer_id, updatePayload]);

  // ── Phase B: detect wallet pass install ──────────────────────────────
  // Polls /customers/{id}/wallet-status (push_registrations count) until at
  // least one device has registered the pass — same signal the demo landing
  // page uses to transition "pass_downloaded" → "pass_installed". Marks the
  // step completed via `completeWithPayload` so the auto-advance fires.
  const installDetectedRef = useRef(false);
  const customerId = progress.payload.demo_customer_id;
  const alreadyCompleted = progress.completed.some(
    (s) => s.chapter === 'first-customer' && s.step === 'first-customer'
  );

  useEffect(() => {
    if (!businessId || !customerId) return;
    if (alreadyCompleted || installDetectedRef.current) return;
    let cancelled = false;

    const tick = async () => {
      if (installDetectedRef.current) return;
      try {
        const status = await getCustomerWalletStatus(businessId, customerId);
        if (cancelled || installDetectedRef.current) return;
        if (!status.installed) return;
        installDetectedRef.current = true;
        await completeWithPayload(
          { chapter: 'first-customer', step: 'first-customer' },
          {}
        );
      } catch {
        // ignore; retry
      }
    };

    const interval = setInterval(tick, POLL_INTERVAL_MS);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [businessId, customerId, alreadyCompleted, completeWithPayload]);

  // Auto-advance once the install is confirmed (step in `completed`).
  useEffect(() => {
    if (!alreadyCompleted) return;
    const id = setTimeout(() => router.push(NEXT_STEP_PATH), AUTO_ADVANCE_DELAY_MS);
    return () => clearTimeout(id);
  }, [alreadyCompleted, router]);

  // Manual escape hatch — owner clicks "I've installed it" if polling
  // somehow misses the registration (slow APNs sync, ad-blockers, etc.).
  const handleManualConfirm = useCallback(async () => {
    if (!customerId || installDetectedRef.current) return;
    installDetectedRef.current = true;
    await completeWithPayload(
      { chapter: 'first-customer', step: 'first-customer' },
      {}
    );
  }, [customerId, completeWithPayload]);

  useEffect(() => {
    ctx.setCanSkip(true);
  }, [ctx]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(signupUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(tErr('saveFailed'));
    }
  }, [signupUrl, tErr]);

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

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <p className="text-[13.5px] text-[var(--foreground)] leading-relaxed">{t('explanation')}</p>

      <SignupUrlCard url={signupUrl} copied={copied} onCopy={handleCopy} t={t} />

      {!isMobile && <QrCard qrCode={qrCode} t={t} />}

      {isMobile && !install.passUrl && !customerDetected && (
        <QuickInstallCard
          registering={registering}
          onInstall={handleQuickInstall}
          t={t}
        />
      )}

      {isMobile && install.passUrl && !alreadyCompleted && (
        <WalletInstallCard
          passUrl={install.passUrl}
          googleWalletUrl={install.googleWalletUrl}
          locale={locale}
          t={t}
        />
      )}

      {alreadyCompleted ? (
        <DetectedCard t={t} />
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
    <div className="rounded-[12px] border border-[var(--border)] bg-white px-4 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] uppercase tracking-wider text-[#999] font-medium mb-0.5">
          {t('signupUrlLabel')}
        </p>
        <p className="text-[13px] font-mono text-[var(--foreground)] truncate">{url}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="flex-shrink-0 inline-flex items-center gap-1 rounded-[8px] border border-[var(--border)] px-2.5 py-2 text-[12px] font-semibold hover:bg-[var(--paper-hover)] transition-colors min-h-[36px]"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? t('copied') : t('copy')}
      </button>
    </div>
  );
}

interface QrCardProps {
  qrCode: string | null;
  t: ReturnType<typeof useTranslations>;
}

function QrCard({ qrCode, t }: QrCardProps) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-white p-5 flex flex-col items-center gap-3">
      <p className="text-[14px] font-semibold text-[var(--foreground)] text-center">{t('qrTitle')}</p>
      <p className="text-[12.5px] text-[#7A7A7A] text-center max-w-[320px] leading-relaxed">
        {t('qrBody')}
      </p>
      {qrCode ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrCode} alt="signup QR" className="w-[200px] h-[200px]" />
      ) : (
        <div className="w-[200px] h-[200px] rounded-[10px] bg-[var(--paper)] flex items-center justify-center">
          <QrCode className="w-12 h-12 text-[#CCC]" />
        </div>
      )}
    </div>
  );
}

interface QuickInstallCardProps {
  registering: boolean;
  onInstall: () => void;
  t: ReturnType<typeof useTranslations>;
}

function QuickInstallCard({ registering, onInstall, t }: QuickInstallCardProps) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-white p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
          <DeviceMobile className="w-5 h-5 text-[var(--accent)]" weight="bold" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[var(--foreground)]">{t('quickInstallTitle')}</p>
          <p className="text-[12.5px] text-[#7A7A7A] leading-relaxed mt-0.5">
            {t('quickInstallBody')}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onInstall}
        disabled={registering}
        className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60 min-h-[48px]"
      >
        {registering ? t('registering') : t('quickInstallCta')}
      </button>
    </div>
  );
}

interface StatusCardProps {
  t: ReturnType<typeof useTranslations>;
}

function PollingHintCard({ t }: StatusCardProps) {
  return (
    <div className="rounded-[12px] border border-[var(--border-light)] bg-[var(--paper)] px-4 py-3 flex items-center gap-3">
      <Spinner className="w-4 h-4 text-[var(--accent)] flex-shrink-0 animate-spin" weight="bold" />
      <p className="text-[12.5px] text-[#555]">{t('pollingHint')}</p>
    </div>
  );
}

interface WatchingCardProps extends StatusCardProps {
  onManualConfirm: () => void;
}

function WatchingCard({ onManualConfirm, t }: WatchingCardProps) {
  return (
    <div className="rounded-[12px] border border-[var(--accent-200)] bg-[var(--accent-light)]/40 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Spinner className="w-4 h-4 text-[var(--accent)] flex-shrink-0 animate-spin" weight="bold" />
        <p className="text-[13px] font-medium text-[var(--foreground)]">{t('watchingInstall')}</p>
      </div>
      <button
        type="button"
        onClick={onManualConfirm}
        className="text-[12px] text-[var(--accent)] hover:underline self-start"
      >
        {t('manualConfirmCta')}
      </button>
    </div>
  );
}

function DetectedCard({ t }: StatusCardProps) {
  return (
    <div className="rounded-[12px] border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-3">
      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" weight="fill" />
      <p className="text-[13px] text-green-900 font-medium">{t('detected')}</p>
    </div>
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
    <div className="rounded-[12px] border border-[var(--border)] bg-white p-5 flex flex-col gap-3 items-center">
      <p className="text-[14px] font-semibold text-[var(--foreground)] text-center">{t('installTitle')}</p>
      <p className="text-[12.5px] text-[#7A7A7A] text-center max-w-[320px] leading-relaxed">
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
    </div>
  );
}
