'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Bell, CheckCircle, Info, LightningIcon, Warning } from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { addStamp, getCustomer } from '@/api/customers';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';

type Phase = 'idle' | 'sending' | 'cooldown';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 10_000;
const RECENT_STAMP_FLASH_MS = 2000;
// Apple Wallet coalesces pass-update pushes that arrive within ~30s. We
// gate the button at 20s so each stamp reliably shows a lock-screen banner
// (the back-field changeMessage). Pushes still fire if you bypass — iOS
// just may not surface every one.
const COOLDOWN_MS = 20_000;
const COOLDOWN_TICK_MS = 1000;

/**
 * Chapter 8 sub-step 2 — optional. The wow moment. Fires a real /stamps call
 * against the demo customer the owner registered in sub-step 1; APNs/Google
 * delivers a push to the wallet pass on the same phone. We poll the customer
 * once a second after firing to confirm the stamp count incremented before
 * declaring success.
 *
 * The owner can stamp repeatedly — each tap fires another real stamp + push,
 * so they can play with notification cadence before leaving the wizard.
 *
 * Disabled if sub-step 1 wasn't completed (no demo_enrollment_id).
 *
 * v3 addition: after the first successful stamp, a `customisationHint`
 * callout fades in once per session pointing the owner to the dashboard's
 * notification customisation page.
 */
export function StampStep() {
  const t = useTranslations('onboardingBusiness.chapters.first-stamp.steps.stamp');
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
  const [recentlyStamped, setRecentlyStamped] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [hasStampedThisSession, setHasStampedThisSession] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ctx.setCanSkip(true);
  }, [ctx]);

  // Load the initial stamp count so the badge isn't blank before the first tap.
  useEffect(() => {
    if (!businessId || !customerId) return;
    let cancelled = false;
    getCustomer(businessId, customerId)
      .then((customer) => {
        if (cancelled) return;
        const count = customer.enrollments?.[0]?.progress?.stamps ?? customer.stamps ?? 0;
        setStamps(count);
      })
      .catch(() => { /* leave null */ });
    return () => { cancelled = true; };
  }, [businessId, customerId]);

  const pollForStamp = useCallback(
    async (initial: number): Promise<number | null> => {
      if (!businessId || !customerId) return null;
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        try {
          const customer = await getCustomer(businessId, customerId);
          const total = customer.enrollments?.[0]?.progress?.stamps ?? customer.stamps ?? 0;
          if (total > initial) return total;
        } catch {
          // ignore; retry
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      return null;
    },
    [businessId, customerId]
  );

  const startCooldown = useCallback(() => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    setCooldownRemaining(Math.ceil(COOLDOWN_MS / 1000));
    setPhase('cooldown');
    const startedAt = Date.now();
    cooldownTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000));
      setCooldownRemaining(remaining);
      if (remaining <= 0) {
        if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
        setPhase('idle');
      }
    }, COOLDOWN_TICK_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const handleSendStamp = useCallback(async () => {
    if (!ready || phase !== 'idle') return;
    setPhase('sending');
    setRecentlyStamped(false);
    try {
      const baseline = stamps ?? 0;
      await addStamp(businessId!, enrollmentId!);
      const next = await pollForStamp(baseline);
      if (next !== null) {
        setStamps(next);
        setRecentlyStamped(true);
        setHasStampedThisSession(true);
        setTimeout(() => setRecentlyStamped(false), RECENT_STAMP_FLASH_MS);
      } else {
        toast.message(t('fallback'));
      }
      startCooldown();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
      setPhase('idle');
    }
  }, [ready, phase, businessId, enrollmentId, stamps, pollForStamp, startCooldown, t, tErr]);

  const handleBypassCooldown = useCallback(() => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = null;
    setCooldownRemaining(0);
    setPhase('idle');
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {!ready ? (
        <PrereqCard t={t} />
      ) : (
        <StampCard
          phase={phase}
          stamps={stamps}
          recentlyStamped={recentlyStamped}
          cooldownRemaining={cooldownRemaining}
          onSend={handleSendStamp}
          onBypassCooldown={handleBypassCooldown}
          t={t}
        />
      )}

      {hasStampedThisSession && <CustomisationHintCard t={t} />}
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
        <p className="wiz-body font-semibold text-amber-900">{t('prereqTitle')}</p>
        <p className="wiz-helper text-amber-800 leading-relaxed mt-0.5">{t('prereqBody')}</p>
      </div>
    </div>
  );
}

interface StampCardProps {
  phase: Phase;
  stamps: number | null;
  recentlyStamped: boolean;
  cooldownRemaining: number;
  onSend: () => void;
  onBypassCooldown: () => void;
  t: ReturnType<typeof useTranslations>;
}

function StampCard({
  phase,
  stamps,
  recentlyStamped,
  cooldownRemaining,
  onSend,
  onBypassCooldown,
  t,
}: StampCardProps) {
  const sending = phase === 'sending';
  const onCooldown = phase === 'cooldown';
  const disabled = sending || onCooldown;
  const hasAnyStamp = stamps !== null && stamps > 0;

  let label: string;
  if (sending) label = t('watching');
  else if (onCooldown) label = t('cooldownCta', { seconds: cooldownRemaining });
  else if (hasAnyStamp) label = t('sendAnotherCta');
  else label = t('sendCta');

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-white p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
          <LightningIcon className="w-5 h-5 text-[var(--accent)]" weight="bold" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="wiz-body font-semibold text-[var(--foreground)]">
            {hasAnyStamp ? t('keepStampingTitle') : t('readyTitle')}
          </p>
          <p className="wiz-helper text-[#7A7A7A] leading-relaxed mt-0.5">
            {hasAnyStamp ? t('keepStampingBody') : t('readyBody')}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSend}
        disabled={disabled}
        className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--accent)] px-4 py-3 wiz-body font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60 min-h-[56px]"
      >
        {label}
      </button>

      <div className="flex items-center justify-center gap-3 wiz-body-sm flex-wrap">
        <div className="flex items-center gap-1.5 rounded-full bg-[var(--paper)] border border-[var(--border-light)] px-3 py-1.5">
          <span className="text-[#999]">{t('stampsLabel')}</span>
          <span className="font-semibold tabular-nums text-[var(--foreground)]">
            {stamps ?? '–'}
          </span>
        </div>
        {recentlyStamped && (
          <span className="inline-flex items-center gap-1 text-green-700 font-medium animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4" weight="fill" />
            {t('justStamped')}
          </span>
        )}
      </div>

      {onCooldown ? (
        <button
          type="button"
          onClick={onBypassCooldown}
          className="wiz-micro text-[#888] hover:text-[var(--foreground)] underline underline-offset-2 self-center"
        >
          {t('bypassCooldown')}
        </button>
      ) : (
        <p className="flex items-start gap-1.5 wiz-micro text-[#888] leading-relaxed">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" weight="bold" />
          <span>{t('coalesceHint')}</span>
        </p>
      )}
    </div>
  );
}

function CustomisationHintCard({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="rounded-[12px] border border-[var(--border-light)] bg-[var(--paper)] p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-[var(--border)] flex items-center justify-center">
        <Bell className="w-4 h-4 text-[var(--accent)]" weight="duotone" />
      </span>
      <p className="wiz-helper text-[#444] leading-relaxed">{t('customisationHint')}</p>
    </div>
  );
}
