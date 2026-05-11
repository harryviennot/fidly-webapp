'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CheckCircle, LightningIcon, Warning } from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { addStamp, getCustomer } from '@/api/customers';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';

type Phase = 'idle' | 'sending' | 'arrived' | 'failed';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 10_000;

/**
 * Chapter 8 — optional. The wow moment. Fires a real /stamps call against
 * the demo customer the owner registered in Chapter 7; APNs/Google delivers
 * a push to the wallet pass on the same phone. We poll the customer once a
 * second after firing to confirm the stamp count incremented before
 * declaring success.
 *
 * Disabled if Chapter 7 wasn't completed (no demo_enrollment_id).
 */
export function LiveStampStep() {
  const t = useTranslations('onboardingBusiness.chapters.live-stamp');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const { progress } = useWizardProgress();
  const ctx = useWizardStep();

  const businessId = currentBusiness?.id;
  const customerId = progress.payload.demo_customer_id;
  const enrollmentId = progress.payload.demo_enrollment_id;
  const ready = !!businessId && !!customerId && !!enrollmentId;

  const [phase, setPhase] = useState<Phase>('idle');
  const [stamps, setStamps] = useState<number | null>(null);

  useEffect(() => {
    ctx.setCanSkip(true);
  }, [ctx]);

  const pollForStamp = useCallback(
    async (initialCount: number): Promise<boolean> => {
      if (!businessId || !customerId) return false;
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        try {
          const customer = await getCustomer(businessId, customerId);
          const total = customer.enrollments?.[0]?.progress?.stamps ?? customer.stamps ?? 0;
          if (total > initialCount) {
            setStamps(total);
            return true;
          }
        } catch {
          // Swallow — retry until deadline.
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      return false;
    },
    [businessId, customerId]
  );

  const handleSendStamp = useCallback(async () => {
    if (!ready) return;
    setPhase('sending');
    try {
      // Capture the count BEFORE the stamp so the poller can detect a delta.
      let initial = 0;
      try {
        const before = await getCustomer(businessId!, customerId!);
        initial = before.enrollments?.[0]?.progress?.stamps ?? before.stamps ?? 0;
      } catch {
        // Tolerate read failure; the stamp call itself is the source of truth.
      }
      await addStamp(businessId!, enrollmentId!);
      const ok = await pollForStamp(initial);
      setPhase(ok ? 'arrived' : 'failed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
      setPhase('failed');
    }
  }, [ready, businessId, customerId, enrollmentId, pollForStamp, tErr]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {!ready ? (
        <PrereqCard t={t} />
      ) : phase === 'arrived' ? (
        <SuccessCard stamps={stamps ?? 1} t={t} />
      ) : (
        <ActionCard
          phase={phase}
          onSend={handleSendStamp}
          t={t}
        />
      )}
    </div>
  );
}

interface PrereqCardProps {
  t: ReturnType<typeof useTranslations>;
}

function PrereqCard({ t }: PrereqCardProps) {
  return (
    <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
      <Warning className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" weight="bold" />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-amber-900">{t('prereqTitle')}</p>
        <p className="text-[12.5px] text-amber-800 leading-relaxed mt-0.5">{t('prereqBody')}</p>
      </div>
    </div>
  );
}

interface ActionCardProps {
  phase: Phase;
  onSend: () => void;
  t: ReturnType<typeof useTranslations>;
}

function ActionCard({ phase, onSend, t }: ActionCardProps) {
  const busy = phase === 'sending';
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-white p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
          <LightningIcon className="w-5 h-5 text-[var(--accent)]" weight="bold" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[var(--foreground)]">{t('readyTitle')}</p>
          <p className="text-[12.5px] text-[#7A7A7A] leading-relaxed mt-0.5">{t('readyBody')}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSend}
        disabled={busy}
        className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60 min-h-[56px]"
      >
        {busy ? t('watching') : t('sendCta')}
      </button>
      {phase === 'failed' && (
        <p className="text-center text-[12px] text-[#999]">{t('fallback')}</p>
      )}
    </div>
  );
}

interface SuccessCardProps {
  stamps: number;
  t: ReturnType<typeof useTranslations>;
}

function SuccessCard({ stamps, t }: SuccessCardProps) {
  return (
    <div className="rounded-[12px] border border-green-200 bg-green-50 p-5 flex flex-col gap-3 items-center text-center">
      <CheckCircle className="w-10 h-10 text-green-600" weight="fill" />
      <p className="text-[15px] font-semibold text-green-900">{t('successTitle')}</p>
      <p className="text-[13px] text-green-800 leading-relaxed">{t('successBody', { count: stamps })}</p>
    </div>
  );
}
