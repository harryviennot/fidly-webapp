"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { AchievementBadge, BADGE_CATEGORY_COLOR } from "./achievement-badge";
import { achievementTitle, type ResolvedAchievement } from "@/lib/achievements";
import { useBusiness } from "@/contexts/business-context";
import { useAchievementCelebration } from "@/hooks/use-business-achievements";

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

/** How long each trophy holds the stage before the next one plays. */
const HOLD_MS = 1900;

/**
 * The "achievement unlocked" moment, shown ONLY on /achievements (so the dashboard
 * is never interrupted). Portaled to <body> so it's a true full-screen takeover
 * over the sidebar, not boxed into the page's scroll area.
 *
 * Multiple unlocks play one after another automatically (no button); after the
 * last, a final summary shows every trophy won with a single acknowledge button,
 * which flips the batch to acknowledged so it never re-fires.
 * See web/docs/dashboard-achievements.md.
 */
export function AchievementCelebration() {
  const t = useTranslations("achievements");
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const firstBroadcast = Boolean(currentBusiness?.settings?.first_broadcast_sent);
  const { pending, acknowledge } = useAchievementCelebration(businessId, firstBroadcast);

  const [queue, setQueue] = useState<ResolvedAchievement[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"playing" | "summary">("playing");
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
    setPhase("playing");
  }, [pending, queue.length]);

  // Auto-advance through the sequence; after the last trophy, land on the summary.
  useEffect(() => {
    if (phase !== "playing" || queue.length === 0) return;
    const isLast = idx + 1 >= queue.length;
    const timer = setTimeout(() => {
      if (isLast) setPhase("summary");
      else setIdx(idx + 1);
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase, idx, queue.length]);

  if (queue.length === 0 || typeof document === "undefined") return null;

  const finishAll = () => {
    acknowledge(queue.map((a) => a.key));
    setQueue([]);
    setIdx(0);
    setPhase("playing");
  };

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("unlockedTitle")}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[var(--foreground)]/60 px-6 py-10 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {phase === "playing" ? (
        <PlayingView a={queue[idx]} index={idx} total={queue.length} t={t} />
      ) : (
        <SummaryView queue={queue} onDone={finishAll} t={t} />
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}

function PlayingView({
  a,
  index,
  total,
  t,
}: {
  a: ResolvedAchievement;
  index: number;
  total: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const color = BADGE_CATEGORY_COLOR[a.category];
  return (
    <div
      key={a.key}
      style={{ "--ach-glow": color } as CSSProperties}
      className="relative flex w-full max-w-[340px] flex-col items-center text-center"
    >
      <div className="relative mb-5 h-[128px] w-[128px] sm:h-[140px] sm:w-[140px]">
        <div className="ach-celebrate-in relative h-full w-full">
          <AchievementBadge
            category={a.category}
            value={a.oneTime ? undefined : a.threshold}
            state="earned"
            isFinalTier={a.isFinalTier}
            oneTime={a.oneTime}
            size={140}
            className="h-full w-full"
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
      <p className="mt-1.5 text-[22px] font-bold leading-tight text-white">
        {achievementTitle(t, a)}
      </p>

      {total > 1 && (
        <p className="mt-4 text-[11px] font-medium tabular-nums text-white/70">
          {index + 1} / {total}
        </p>
      )}
    </div>
  );
}

function SummaryView({
  queue,
  onDone,
  t,
}: {
  queue: ResolvedAchievement[];
  onDone: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const many = queue.length > 1;
  return (
    <div className="flex w-full max-w-[480px] flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
      <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/80">
        {many ? t("celebration.summaryTitle", { count: queue.length }) : t("unlockedTitle")}
      </p>

      <div className="mt-6 flex flex-wrap items-start justify-center gap-x-6 gap-y-7">
        {queue.map((a) => (
          <div
            key={a.key}
            className={
              many
                ? "flex w-[120px] flex-col items-center gap-2.5"
                : "flex max-w-[260px] flex-col items-center gap-2.5"
            }
          >
            <AchievementBadge
              category={a.category}
              value={a.oneTime ? undefined : a.threshold}
              state="earned"
              isFinalTier={a.isFinalTier}
              oneTime={a.oneTime}
              size={many ? 100 : 128}
            />
            <p
              className={
                many
                  ? "line-clamp-2 text-[11px] font-medium leading-snug text-white/90"
                  : "text-[18px] font-bold leading-tight text-white"
              }
            >
              {achievementTitle(t, a)}
            </p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onDone}
        autoFocus
        className="mt-8 inline-flex w-full max-w-[220px] items-center justify-center rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[var(--foreground)] shadow-lg transition-transform hover:scale-[1.02]"
      >
        {t("celebration.done")}
      </button>
    </div>
  );
}
