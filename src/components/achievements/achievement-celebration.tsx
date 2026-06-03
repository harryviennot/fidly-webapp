"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { AchievementBadge, BADGE_CATEGORY_COLOR } from "./achievement-badge";
import {
  achievementTitle,
  ACHIEVEMENT_CTA,
  type ResolvedAchievement,
} from "@/lib/achievements";
import { useBusiness } from "@/contexts/business-context";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useAchievementSync } from "@/hooks/use-business-achievements";

/** A ring of particles flung outward — deterministic (index-driven), no runtime
 *  randomness, so it's stable across renders. */
const SPARKLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const dist = 116 + (i % 3) * 30;
  return {
    tx: `${Math.round(Math.cos(angle) * dist)}px`,
    ty: `${Math.round(Math.sin(angle) * dist)}px`,
    d: `${(i % 5) * 0.05}s`,
  };
});

const HOLD_MS = 2600;

/**
 * The one impactful "achievement unlocked" moment. Mounted ONCE in the dashboard
 * layout so it fires from any surface the instant a fresh unlock is recorded. It
 * owns the celebration queue and acknowledges the batch when dismissed, so a
 * trophy is celebrated exactly once and never re-fires.
 * See web/docs/dashboard-achievements.md.
 */
export function AchievementCelebration() {
  const t = useTranslations("achievements");
  const { currentBusiness } = useBusiness();
  const { hasFeature } = useEntitlements();
  const businessId = currentBusiness?.id;
  const firstBroadcast = Boolean(currentBusiness?.settings?.first_broadcast_sent);
  const { pending, acknowledge } = useAchievementSync(businessId, firstBroadcast);

  const [queue, setQueue] = useState<ResolvedAchievement[]>([]);
  const [idx, setIdx] = useState(0);
  // Keys we've already pulled into a batch — so a post-acknowledge refetch (or a
  // re-render mid-celebration) never re-queues the same trophy.
  const celebratingRef = useRef<Set<string>>(new Set());

  // Pull a fresh batch in when we're idle.
  useEffect(() => {
    if (queue.length > 0) return;
    const fresh = pending.filter((a) => !celebratingRef.current.has(a.key));
    if (fresh.length === 0) return;
    fresh.forEach((a) => celebratingRef.current.add(a.key));
    setQueue(fresh);
    setIdx(0);
  }, [pending, queue.length]);

  const current = queue[idx];

  // Auto-advance through the batch; acknowledge all of it at the end.
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => {
      setIdx((i) => {
        if (i + 1 < queue.length) return i + 1;
        acknowledge(queue.map((a) => a.key));
        setQueue([]);
        return 0;
      });
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [idx, current, queue, acknowledge]);

  if (!current) return null;

  const dismiss = () => {
    setIdx((i) => {
      if (i + 1 < queue.length) return i + 1;
      acknowledge(queue.map((a) => a.key));
      setQueue([]);
      return 0;
    });
  };

  const color = BADGE_CATEGORY_COLOR[current.category];
  const cta = ACHIEVEMENT_CTA[current.metric];
  const scanUrl = process.env.NEXT_PUBLIC_SCAN_URL;
  const ctaHref = cta ? (cta.external ? scanUrl : cta.href) : undefined;
  const ctaVisible =
    !!cta && !!ctaHref && (!cta.featureGate || hasFeature(cta.featureGate));

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("unlockedTitle")}
      onClick={dismiss}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--foreground)]/55 px-6 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        key={current.key}
        onClick={(e) => e.stopPropagation()}
        style={{ "--ach-glow": color } as CSSProperties}
        className="relative flex flex-col items-center text-center"
      >
        <div className="ach-rays" aria-hidden />

        <div className="relative mb-5 h-[140px] w-[140px]">
          <div className="ach-celebrate-in relative h-full w-full">
            <AchievementBadge
              category={current.category}
              value={current.oneTime ? undefined : current.threshold}
              state="earned"
              isFinalTier={current.isFinalTier}
              oneTime={current.oneTime}
              size={140}
            />
            <div className="ach-shine-sweep" aria-hidden />
          </div>
          {SPARKLES.map((s, i) => (
            <span
              key={i}
              className="ach-sparkle"
              aria-hidden
              style={{ "--tx": s.tx, "--ty": s.ty, "--d": s.d } as CSSProperties}
            />
          ))}
        </div>

        <p className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
          {t("unlockedTitle")}
        </p>
        <p className="mt-1.5 max-w-[300px] text-[22px] font-bold leading-tight text-white">
          {achievementTitle(t, current)}
        </p>

        {ctaVisible &&
          (cta!.external ? (
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[var(--foreground)] shadow-lg transition-transform hover:scale-[1.03]"
            >
              {t(`cta.${cta!.labelKey}`)}
              <ArrowRight className="h-4 w-4" weight="bold" />
            </a>
          ) : (
            <Link
              href={ctaHref!}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[var(--foreground)] shadow-lg transition-transform hover:scale-[1.03]"
            >
              {t(`cta.${cta!.labelKey}`)}
              <ArrowRight className="h-4 w-4" weight="bold" />
            </Link>
          ))}

        {queue.length > 1 && (
          <p className="mt-4 text-[11px] font-medium tabular-nums text-white/70">
            {idx + 1} / {queue.length}
          </p>
        )}
      </div>
    </div>
  );
}
