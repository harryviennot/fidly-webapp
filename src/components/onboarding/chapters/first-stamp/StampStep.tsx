'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CaretDown, CheckCircle, Info, Warning } from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { addStamp } from '@/api/customers';
import { StampIconSvg, type StampIconType } from '@/components/design/StampIconPicker';
import { Card } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { InfoBox } from '@/components/reusables/info-box';
import { useActiveDesign, useDesigns } from '@/hooks/use-designs';
import { computeCardColors } from '@/lib/card-utils';
import { cn } from '@/lib/utils';
import type { CardDesign } from '@/types';
import { useWizardStep } from '../../wizard-context';
import { useBusinessInstalls, type BusinessInstall } from './useBusinessInstalls';
import { useDesignReady } from './useDesignReady';
import { useEnsureActiveDesign } from './useEnsureActiveDesign';

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
// gate the button at 20s so each stamp reliably shows a lock-screen banner.
const COOLDOWN_MS = 20_000;
const COOLDOWN_TICK_MS = 1000;
// Hard cap on stamps fired from this demo step. Two is enough to feel the
// wow twice; more would just batch into Apple's coalesce window and ruin
// the next chapter's broadcast push.
const MAX_STAMPS = 2;

/**
 * Chapter 7 sub-step 2 — optional. The wow moment. Fans out a real /stamps
 * call to every installed demo customer of this business so every device the
 * owner enrolled buzzes at once. We track per-customer stamp progress via
 * `useBusinessInstalls` and poll after each tap until the counts move (or
 * the poll deadline elapses).
 *
 * Disabled if there are zero installed customers — the owner needs to install
 * their own card first.
 */
export function StampStep() {
  const t = useTranslations('onboardingBusiness.chapters.first-stamp.steps.stamp');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const ctx = useWizardStep();

  const businessId = currentBusiness?.id;
  const { installs, installedCount, refetch, loading: installsLoading } = useBusinessInstalls(businessId);
  const installedWithEnrollment = useMemo(
    () => installs.filter((i) => i.installed && i.enrollment_id),
    [installs]
  );

  // Canonical stamp count for the action card: highest stamp count among
  // installed customers. They all move together when the fan-out succeeds,
  // and "max" beats "min" if one stamp call partially fails (we'll surface
  // the partial result in the toast).
  const stamps = installedWithEnrollment.length
    ? Math.max(0, ...installedWithEnrollment.map((i) => i.stamps))
    : null;
  const ready = installedWithEnrollment.length >= 1;

  const { data: design } = useActiveDesign(businessId);

  // Defensive activation: if the user landed here directly (revisit after
  // install was already marked complete) and the design is somehow not
  // active — race with InstallStep's effect, server-side deactivation,
  // whatever — heal it here too. Without this, stamps fan out to a pass
  // pointing at a draft design and the wizard appears broken.
  const { data: designs = [] } = useDesigns(businessId);
  const wizardDesign = designs[0];
  const wizardDesignId = wizardDesign?.id;
  const { ready: designReady, isActive: designIsActive } = useDesignReady(
    businessId,
    wizardDesignId,
    wizardDesign
  );
  useEnsureActiveDesign(businessId, wizardDesignId, designReady, designIsActive);

  const [phase, setPhase] = useState<Phase>('idle');
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

  // Once the owner has felt at least one stamp, the footer's
  // "Send me a stamp" copy stops making sense — they already did. Flip
  // back to the default "Continue" by clearing the override so the shell's
  // i18n fallback (footer.next) takes over.
  useEffect(() => {
    if ((stamps ?? 0) > 0) {
      ctx.setNextLabel(null);
    }
  }, [stamps, ctx]);

  const pollForStamp = useCallback(
    async (baseline: number): Promise<boolean> => {
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await refetch();
        const current = Math.max(
          0,
          ...installedWithEnrollment.map((i) => i.stamps)
        );
        if (current > baseline) return true;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      return false;
    },
    // installedWithEnrollment is intentionally NOT in deps — we capture a
    // fresh snapshot via refetch() on each loop iteration. Adding it would
    // restart polling every tick.
    [refetch, installedWithEnrollment]
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
    if (!ready || phase !== 'idle' || !businessId) return;
    if ((stamps ?? 0) >= MAX_STAMPS) return;
    setPhase('sending');
    setRecentlyStamped(false);
    const baseline = stamps ?? 0;
    // Snapshot enrollments to fan out across — refetches during polling
    // would otherwise narrow/widen the set mid-stamp.
    const targets = installedWithEnrollment;
    try {
      const results = await Promise.allSettled(
        targets.map((i) => addStamp(businessId, i.enrollment_id!))
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      const succeeded = targets.length - failed;
      if (failed > 0) {
        toast.error(
          `Stamped ${succeeded} of ${targets.length} devices. ${failed} failed.`
        );
      }
      const moved = await pollForStamp(baseline);
      if (moved) {
        setRecentlyStamped(true);
        setTimeout(() => setRecentlyStamped(false), RECENT_STAMP_FLASH_MS);
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
      } else if (succeeded > 0) {
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
    stamps,
    installedWithEnrollment,
    pollForStamp,
    startCooldown,
    hasStampedThisSession,
    t,
    tErr,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 animate-slide-up">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="animate-slide-up delay-80">
        {installsLoading ? (
          <StampCardSkeleton />
        ) : !ready ? (
          <PrereqCard t={t} />
        ) : (
          <StampCard
            phase={phase}
            stamps={stamps}
            installedCount={installedCount}
            installs={installedWithEnrollment}
            recentlyStamped={recentlyStamped}
            cooldownRemaining={cooldownRemaining}
            showCelebration={showCelebration}
            design={design ?? null}
            onSend={handleSendStamp}
            t={t}
          />
        )}
      </div>

      {((stamps ?? 0) >= 1) && <CustomisationHintCard t={t} />}
    </div>
  );
}

interface PrereqCardProps {
  t: ReturnType<typeof useTranslations>;
}

/**
 * Skeleton mirror of <StampCard> so the page doesn't flash a "no card
 * installed" warning while `useBusinessInstalls` is still fetching. Same
 * outer shape, same vertical rhythm — just shimmer blocks where real
 * content lands. Avoids the layout shift the warning-then-card flicker
 * used to cause.
 */
function StampCardSkeleton() {
  return (
    <Card hover={false} className="p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--paper)] animate-pulse" />
        <div className="flex-1 min-w-0 flex flex-col gap-2 pt-1">
          <span className="block h-4 w-2/5 rounded bg-[var(--paper)] animate-pulse" />
          <span className="block h-3 w-4/5 rounded bg-[var(--paper)] animate-pulse" />
          <span className="block h-3 w-3/5 rounded bg-[var(--paper)] animate-pulse" />
        </div>
      </div>
      <span className="block h-14 w-full rounded-[10px] bg-[var(--paper)] animate-pulse" />
      <div className="flex items-center justify-center">
        <span className="block h-7 w-32 rounded-full bg-[var(--paper)] animate-pulse" />
      </div>
      <span className="block h-10 w-full rounded-lg bg-[var(--paper)] animate-pulse" />
    </Card>
  );
}

function PrereqCard({ t }: PrereqCardProps) {
  return (
    <Card hover={false} className="border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
      <Warning className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" weight="bold" />
      <div className="flex-1 min-w-0">
        <p className="wiz-body font-semibold text-amber-900">{t('prereqTitle')}</p>
        <p className="wiz-helper text-amber-800 leading-relaxed mt-0.5">{t('prereqBody')}</p>
      </div>
    </Card>
  );
}

interface StampCardProps {
  phase: Phase;
  stamps: number | null;
  installedCount: number;
  installs: BusinessInstall[];
  recentlyStamped: boolean;
  cooldownRemaining: number;
  showCelebration: boolean;
  design: CardDesign | null;
  onSend: () => void;
  t: ReturnType<typeof useTranslations>;
}

function StampCard({
  phase,
  stamps,
  installedCount,
  installs,
  recentlyStamped,
  cooldownRemaining,
  showCelebration,
  design,
  onSend,
  t,
}: StampCardProps) {
  const sending = phase === 'sending';
  const onCooldown = phase === 'cooldown';
  const hasAnyStamp = stamps !== null && stamps > 0;
  const reachedMax = (stamps ?? 0) >= MAX_STAMPS;
  const disabled = sending || onCooldown || reachedMax;

  let label: string;
  if (sending) label = t('watching');
  else if (onCooldown) label = t('cooldownCta', { seconds: cooldownRemaining });
  else if (hasAnyStamp) label = t('sendAnotherCta');
  else label = t('sendCta');

  let title: string;
  let body: string;
  if (reachedMax && !showCelebration) {
    title = t('demoCompleteTitle');
    body = t('demoCompleteBody');
  } else if (showCelebration) {
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
    <Card hover={false} className="p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <StampAvatar design={design} />
        <div className="flex-1 min-w-0">
          <p className="wiz-body font-semibold text-[var(--foreground)]">{title}</p>
          <p className="wiz-helper text-[#7A7A7A] leading-relaxed mt-0.5">{body}</p>
        </div>
      </div>

      {installedCount > 1 && (
        <p className="wiz-helper text-[var(--accent)] font-medium">
          {t('multiDeviceHint', { count: installedCount })}
        </p>
      )}

      {!reachedMax && (
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--accent)] px-4 py-3 wiz-body font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60 min-h-[56px]"
        >
          {label}
        </button>
      )}

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

      {/* When more than one device is installed, surface the per-device list
          so the owner can see all of them moving in lockstep. */}
      {installs.length > 1 && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--border-light)] bg-[var(--paper)] px-3 py-2">
          {installs.map((i) => (
            <div
              key={i.customer_id}
              className="flex items-center justify-between gap-2 wiz-helper"
            >
              <span className="text-[#666] truncate">{i.name || i.email || i.customer_id.slice(0, 8)}</span>
              <span className="font-semibold tabular-nums text-[var(--foreground)]">{i.stamps}</span>
            </div>
          ))}
        </div>
      )}

      <WalletDeliveryDisclosure t={t} />
    </Card>
  );
}

/**
 * Single collapsed disclosure replacing the previous pair of always-visible
 * Apple/Google hint boxes. Keeps the action card focused on the moment
 * (send the stamp, see it land) while still giving the owner a single
 * place to learn why the notification might be delayed — Apple coalescing,
 * battery state, network type — and the reassurance that the stamp itself
 * was recorded server-side regardless.
 */
function WalletDeliveryDisclosure({ t }: { t: ReturnType<typeof useTranslations> }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-[var(--border-light)] bg-[var(--paper)]">
        <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left wiz-helper text-[var(--foreground)] hover:bg-[var(--paper-hover)] transition-colors rounded-lg">
          <span className="flex items-center gap-2 min-w-0">
            <Info className="w-4 h-4 text-[#8A8A8A] flex-shrink-0" weight="fill" />
            <span className="font-semibold leading-snug">
              {t('deliveryDisclosure.summary')}
            </span>
          </span>
          <CaretDown
            className={cn(
              'w-3.5 h-3.5 text-[#8A8A8A] transition-transform flex-shrink-0',
              open && 'rotate-180'
            )}
            weight="bold"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3 pt-0 flex flex-col gap-3">
          <DisclosureBlock
            title={t('deliveryDisclosure.appleTitle')}
            body={t('deliveryDisclosure.appleBody')}
          />
          <DisclosureBlock
            title={t('deliveryDisclosure.googleTitle')}
            body={t('deliveryDisclosure.googleBody')}
          />
          <DisclosureBlock
            title={t('deliveryDisclosure.reassuranceTitle')}
            body={t('deliveryDisclosure.reassuranceBody')}
            emphasis
          />
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function DisclosureBlock({
  title,
  body,
  emphasis = false,
}: {
  title: string;
  body: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p
        className={cn(
          'wiz-helper font-semibold leading-snug',
          emphasis ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'
        )}
      >
        {title}
      </p>
      <p className="wiz-helper text-[#666] leading-relaxed">{body}</p>
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
      variant="info"
      message={t('customisationHint')}
      className="animate-in fade-in slide-in-from-bottom-2 duration-300"
    />
  );
}
