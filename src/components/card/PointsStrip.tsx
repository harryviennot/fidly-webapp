"use client";

import { useTranslations } from "next-intl";
import {
  StampIconSvg,
  type StampIconType,
} from "@/components/design/StampIconPicker";
import type { PointsRewardIcons, PointsStripStyle, RewardTier } from "@/types";

interface PointsStripProps {
  style: PointsStripStyle;
  /** Current sample balance (preview slider). */
  balance: number;
  /** Reward ladder (any order; sorted internally by threshold). */
  rewards: RewardTier[];
  /** Per-reward icon choices (progress_icons style). */
  rewardIcons?: PointsRewardIcons;
  /** Resolved colors. */
  accentColor: string;
  mutedColor: string;
  textColor: string;
  /** Optional balance cap subtext. */
  maxLimit?: number | null;
}

/**
 * In-editor approximation of the backend points strip (3 styles). The
 * authoritative render is produced server-side by `points_strip_generator.py`;
 * this mirrors its layout closely enough for the designer's live preview.
 */
export function PointsStrip({
  style,
  balance,
  rewards,
  rewardIcons,
  accentColor,
  mutedColor,
  textColor,
  maxLimit,
}: PointsStripProps) {
  const t = useTranslations("designEditor.pointsStrip");
  const sorted = [...rewards].sort((a, b) => a.threshold - b.threshold);
  const nextReward = sorted.find((r) => r.threshold > balance) ?? null;
  const afterReward = nextReward
    ? sorted.find((r) => r.threshold > nextReward.threshold) ?? null
    : null;
  const isComplete = sorted.length > 0 && balance >= sorted[sorted.length - 1].threshold;

  const objective = (
    <div className="flex flex-col gap-1 text-left">
      {isComplete ? (
        <>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>
            {t("complete")}
          </span>
          {maxLimit != null && (
            <span className="text-[10px]" style={{ color: mutedColor }}>
              {t("limit", { max: maxLimit })}
            </span>
          )}
        </>
      ) : (
        <>
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: mutedColor }}>
            {t("objective")}
          </span>
          <span className="text-[14px] font-bold leading-none" style={{ color: textColor }}>
            {nextReward ? t("points", { points: nextReward.threshold }) : "—"}
          </span>
          {afterReward && (
            <span className="text-[10px] mt-0.5" style={{ color: mutedColor }}>
              {t("next", { points: afterReward.threshold })}
            </span>
          )}
        </>
      )}
    </div>
  );

  if (style === "big_point") {
    return (
      <div className="flex items-center justify-between gap-4 px-3 py-2 w-full">
        {objective}
        <span className="text-[34px] font-extrabold tabular-nums leading-none" style={{ color: accentColor }}>
          {balance}
        </span>
      </div>
    );
  }

  if (style === "circle_progress") {
    const target = nextReward?.threshold ?? sorted[sorted.length - 1]?.threshold ?? 1;
    const prev = sorted.filter((r) => r.threshold <= balance).slice(-1)[0]?.threshold ?? 0;
    const span = Math.max(1, target - prev);
    const pct = Math.max(0, Math.min(1, (balance - prev) / span));
    const r = 26;
    const circ = 2 * Math.PI * r;
    return (
      <div className="flex items-center justify-between gap-4 px-3 py-2 w-full">
        {objective}
        <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={r} fill="none" stroke={mutedColor} strokeWidth="5" opacity={0.35} />
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke={accentColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct)}
              transform="rotate(-90 32 32)"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-[15px] font-bold tabular-nums"
            style={{ color: accentColor }}
          >
            {balance}
          </span>
        </div>
      </div>
    );
  }

  // progress_icons — horizontal milestone track
  const maxThreshold = sorted[sorted.length - 1]?.threshold ?? 1;
  const fillPct = Math.max(0, Math.min(1, balance / maxThreshold));
  return (
    <div className="flex flex-col gap-2 px-3 py-2 w-full">
      <span className="text-[14px] font-bold tabular-nums leading-none" style={{ color: accentColor }}>
        {t("points", { points: balance })}
      </span>
      <div className="relative flex items-center justify-between pt-1">
        {/* track */}
        <div className="absolute left-2 right-2 top-[14px] h-[3px] rounded-full" style={{ background: mutedColor, opacity: 0.4 }} />
        <div
          className="absolute left-2 top-[14px] h-[3px] rounded-full"
          style={{ background: accentColor, width: `calc(${fillPct * 100}% - 8px)` }}
        />
        {sorted.map((reward) => {
          const reached = balance >= reward.threshold;
          const choice = rewardIcons?.[reward.id];
          const iconName = (choice?.type === "preset" ? choice.ref : "gift") as StampIconType;
          return (
            <div key={reward.id} className="relative z-10 flex flex-col items-center gap-1" style={{ width: 40 }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: reached ? accentColor : "transparent",
                  border: `2px solid ${reached ? accentColor : mutedColor}`,
                }}
              >
                <StampIconSvg
                  icon={iconName}
                  className="w-3.5 h-3.5"
                  color={reached ? "#fff" : mutedColor}
                />
              </div>
              <span
                className="text-[9px] tabular-nums"
                style={{ color: reached ? textColor : mutedColor }}
              >
                {reward.threshold}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
