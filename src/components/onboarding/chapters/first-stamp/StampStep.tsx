'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CheckCircle, Warning } from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { addStamp, getCustomer } from '@/api/customers';
import { StampIconSvg, type StampIconType } from '@/components/design/StampIconPicker';
import { InfoBox } from '@/components/reusables/info-box';
import { useActiveDesign } from '@/hooks/use-designs';
import { computeCardColors } from '@/lib/card-utils';
import type { CardDesign } from '@/types';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';

type Phase = 'idle' | 'sending' | 'cooldown';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 10_000;
// Confirmation pill stays up long enough for the owner to actually read it.
// Earlier 2s felt like it flickered, which undercut the "feel that?" moment.
const RECENT_STAMP_FLASH_MS = 3500;
// First-stamp celebration moment. Long enough to read "Did you feel that?"
// + the body line but short enough to fade before the cooldown ends, so
// the keep-stamping copy is back by the time the button is tappable again.
const CELEBRATION_MS = 6500;
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

  const { data: design } = useActiveDesign(businessId);

  const [phase, setPhase] = useState<Phase>('idle');
  const [stamps, setStamps] = useState<number | null>(null);
  const [recentlyStamped, setRecentlyStamped] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [hasStampedThisSession, setHasStampedThisSession] = useState(false);
  // True for ~CELEBRATION_MS after the *first* successful stamp this
  // session. Drives the "Did you feel that?" copy in the action card.
  const [showCelebration, setShowCelebration] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
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
        setTimeout(() => setRecentlyStamped(false), RECENT_STAMP_FLASH_MS);
        // Celebrate the *first* stamp of the session only — subsequent
        // stamps reuse the keep-stamping copy.
        if (!hasStampedThisSession) {
          setShowCelebration(true);
          if (celebrationTimerRef.current) {
            clearTimeout(celebrationTimerRef.current);
          }
          celebrationTimerRef.current = setTimeout(() => {
            setShowCelebration(false);
            celebrationTimerRef.current = null;
          }, CELEBRATION_MS);
        }
        setHasStampedThisSession(true);
      } else {
        toast.message(t('fallback'));
      }
      startCooldown();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
      setPhase('idle');
    }
  }, [
    ready,
    phase,
    businessId,
    enrollmentId,
    stamps,
    pollForStamp,
    startCooldown,
    hasStampedThisSession,
    t,
    tErr,
  ]);

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
          showCelebration={showCelebration}
          design={design ?? null}
          onSend={handleSendStamp}
          onBypassCooldown={handleBypassCooldown}
          t={t}
        />
      )}

      {((stamps ?? 0) >= 1) && <CustomisationHintCard t={t} />}
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
  showCelebration: boolean;
  design: CardDesign | null;
  onSend: () => void;
  onBypassCooldown: () => void;
  t: ReturnType<typeof useTranslations>;
}

function StampCard({
  phase,
  stamps,
  recentlyStamped,
  cooldownRemaining,
  showCelebration,
  design,
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

  let title: string;
  let body: string;
  if (showCelebration) {
    title = t('firstStampLandedTitle');
    body = t('firstStampLandedBody');
  } else if (hasAnyStamp) {
    title = t('keepStampingTitle');
    body = t('keepStampingBody');
  } else {
    title = t('readyTitle');
    body = t('readyBody');
  }

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-white p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <StampAvatar design={design} />
        <div className="flex-1 min-w-0">
          <p className="wiz-body font-semibold text-[var(--foreground)]">{title}</p>
          <p className="wiz-helper text-[#7A7A7A] leading-relaxed mt-0.5">{body}</p>
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

      <div className="flex flex-col gap-2">
        <InfoBox variant="note" message={t('appleWalletHint')} />
        <InfoBox variant="note" message={t('googleWalletHint')} />
      </div>

      {onCooldown && (
        <button
          type="button"
          onClick={onBypassCooldown}
          className="wiz-micro text-[#888] hover:text-[var(--foreground)] underline underline-offset-2 self-center"
        >
          {t('bypassCooldown')}
        </button>
      )}
    </div>
  );
}

/**
 * Circular avatar in the action card header that mirrors a single stamp from
 * the owner's chosen design — same fill, same icon, same icon color. Falls
 * back to the accent token while the design query is still pending so the
 * card doesn't pop in a blank circle on first render.
 */
function StampAvatar({ design }: { design: CardDesign | null }) {
  const colors = design ? computeCardColors(design) : null;
  const stampIcon = (design?.stamp_icon as StampIconType | undefined) ?? 'checkmark';
  const backgroundColor = colors?.accentHex ?? 'var(--accent-light)';
  const iconColor = colors?.iconColorHex ?? 'var(--accent)';
  return (
    <span
      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
      style={{ backgroundColor }}
    >
      <StampIconSvg icon={stampIcon} className="w-5 h-5" color={iconColor} />
    </span>
  );
}

function CustomisationHintCard({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <InfoBox
      variant="note"
      message={t('customisationHint')}
      className="animate-in fade-in slide-in-from-bottom-2 duration-300"
    />
  );
}
