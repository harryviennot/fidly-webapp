'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { toast } from 'sonner';
import { CheckCircle, DeviceMobile } from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { useAuth } from '@/contexts/auth-provider';
import { createPublicCustomer, enrollmentIdFromPassUrl } from '@/api/customers';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';

interface InstallState {
  passUrl?: string;
  googleWalletUrl?: string;
}

/**
 * Chapter 7 — optional. Registers the owner as their first customer so a
 * real wallet pass gets generated, then exposes the Apple Wallet + Google
 * Wallet install buttons. Storing demo_customer_id + demo_enrollment_id in
 * setup_progress.payload unlocks the live-stamp step (Ch 8).
 *
 * v1 uses a manual "I've installed it" confirmation rather than push-
 * registration polling — the magic moment is the next step (the actual
 * stamp + push), not detecting install.
 */
export function FirstCustomerStep() {
  const t = useTranslations('onboardingBusiness.chapters.first-customer');
  const tErr = useTranslations('onboardingBusiness.errors');
  const locale = useLocale();
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const { progress, updatePayload } = useWizardProgress();
  const ctx = useWizardStep();

  const businessId = currentBusiness?.id;
  const payloadCustomerId = progress.payload.demo_customer_id;
  const payloadEnrollmentId = progress.payload.demo_enrollment_id;
  const alreadyRegistered = !!payloadCustomerId && !!payloadEnrollmentId;

  const [install, setInstall] = useState<InstallState>({});
  const [registering, setRegistering] = useState(false);

  // Pre-fill from user_metadata / Supabase user. Phone is optional.
  const ownerName = (user?.user_metadata?.name as string | undefined) ?? '';
  const ownerEmail = user?.email ?? '';
  const ownerPhone = (user?.user_metadata?.phone as string | undefined) ?? '';

  const handleRegister = useCallback(async () => {
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

  useEffect(() => {
    ctx.setCanSkip(true);
  }, [ctx]);

  // If the user previously registered (e.g. resumed mid-wizard), don't show
  // the registration button — go straight to wallet install. We re-derive
  // the pass URL on demand only if we don't have it cached locally.
  const showInstall = alreadyRegistered || !!install.passUrl;
  const passUrl = install.passUrl ?? (payloadEnrollmentId ? `/passes/${payloadEnrollmentId}` : undefined);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {!showInstall ? (
        <RegisterCard
          name={ownerName}
          email={ownerEmail}
          registering={registering}
          onRegister={handleRegister}
          t={t}
        />
      ) : (
        <InstallCard
          passUrl={passUrl}
          googleWalletUrl={install.googleWalletUrl}
          locale={locale}
          t={t}
        />
      )}
    </div>
  );
}

interface RegisterCardProps {
  name: string;
  email: string;
  registering: boolean;
  onRegister: () => void;
  t: ReturnType<typeof useTranslations>;
}

function RegisterCard({ name, email, registering, onRegister, t }: RegisterCardProps) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-white p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
          <DeviceMobile className="w-5 h-5 text-[var(--accent)]" weight="bold" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[var(--foreground)]">{t('registerTitle')}</p>
          <p className="text-[12.5px] text-[#7A7A7A] leading-relaxed mt-0.5">
            {t('registerBody')}
          </p>
        </div>
      </div>
      <div className="rounded-[10px] bg-[var(--paper)] border border-[var(--border-light)] px-3 py-2.5 text-[12.5px] text-[#555]">
        <p>
          <span className="text-[#999]">{t('asNameLabel')}:</span> <strong>{name || '—'}</strong>
        </p>
        <p>
          <span className="text-[#999]">{t('asEmailLabel')}:</span> <strong>{email || '—'}</strong>
        </p>
      </div>
      <button
        type="button"
        onClick={onRegister}
        disabled={registering}
        className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60 min-h-[48px]"
      >
        {registering ? t('registering') : t('registerCta')}
      </button>
    </div>
  );
}

interface InstallCardProps {
  passUrl?: string;
  googleWalletUrl?: string;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}

function InstallCard({ passUrl, googleWalletUrl, locale, t }: InstallCardProps) {
  const appleSrc = locale === 'fr' ? '/AppleWalletFR.svg' : '/AppleWallet.svg';
  const googleSrc = locale === 'fr' ? '/GoogleWalletFR.svg' : '/GoogleWallet.svg';

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-white p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-600" weight="fill" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[var(--foreground)]">{t('installTitle')}</p>
          <p className="text-[12.5px] text-[#7A7A7A] leading-relaxed mt-0.5">{t('installBody')}</p>
        </div>
      </div>

      <div className="flex flex-row flex-wrap items-center justify-center gap-3 py-2">
        {passUrl && (
          <a href={passUrl} className="block hover:opacity-90 transition-opacity">
            <Image src={appleSrc} alt={t('addToAppleWallet')} width={200} height={50} className="h-[50px] w-auto" />
          </a>
        )}
        {googleWalletUrl && (
          <a href={googleWalletUrl} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
            <Image src={googleSrc} alt={t('addToGoogleWallet')} width={200} height={50} className="h-[50px] w-auto" />
          </a>
        )}
      </div>

      <p className="text-center text-[11.5px] text-[#999]">{t('installHint')}</p>
    </div>
  );
}
