"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { CompletionRing } from "@/components/reusables/completion-ring";
import { ProgressBar } from "@/components/reusables/progress-bar";
import { AchievementCtaLink } from "./achievement-cta";
import {
  achievementTitle,
  achievementValueLabel,
  type ComputedAchievements,
} from "@/lib/achievements";

const fmt = (n: number) => n.toLocaleString();

/**
 * Top-of-page summary: how far the owner has come (completion ring + earned this
 * month) and the single trophy they're closest to, with the action that earns it.
 * Answers "how am I doing / what's next / what do I do" in one glance.
 */
export function AchievementHero({ computed }: { computed: ComputedAchievements }) {
  const t = useTranslations("achievements");
  const earned = computed.earnedCount;
  const total = computed.totalCount;
  const pct = total > 0 ? earned / total : 0;

  // Adaptive recency line. As an owner gets deep into the ladders, months can
  // pass between unlocks — a bare "0 this month" would read as failure. So we
  // fall back month -> year, and when even the year is empty we drop the line
  // entirely (the always-reachable "next up" goal carries the forward motion).
  const now = new Date();
  const earnedThisMonth = computed.all.filter((a) => {
    if (!a.unlocked || !a.unlockedAt) return false;
    const d = new Date(a.unlockedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const earnedThisYear = computed.all.filter((a) => {
    if (!a.unlocked || !a.unlockedAt) return false;
    return new Date(a.unlockedAt).getFullYear() === now.getFullYear();
  }).length;
  const recencyLine =
    earnedThisMonth > 0
      ? t("hero.earnedThisMonth", { count: earnedThisMonth })
      : earnedThisYear > 0
        ? t("hero.earnedThisYear", { count: earnedThisYear })
        : null;

  const next = computed.inProgress[0];

  return (
    <Card flat className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-4">
        <CompletionRing value={pct} size={84} stroke={9}>
          <span className="text-[20px] font-bold tabular-nums text-[var(--foreground)]">
            {earned}
          </span>
          <span className="text-[11px] text-[var(--muted-foreground)]">/ {total}</span>
        </CompletionRing>
        <div>
          <p className="text-[15px] font-semibold text-[var(--foreground)]">
            {t("hero.earnedTitle", { earned, total })}
          </p>
          {recencyLine && (
            <p className="mt-0.5 text-[12.5px] text-[var(--muted-foreground)]">{recencyLine}</p>
          )}
        </div>
      </div>

      {next && (
        <div className="sm:ml-auto sm:border-l sm:border-[var(--border)] sm:pl-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {t("hero.nextUp")}
          </p>
          <p className="mt-1 text-[14px] font-semibold text-[var(--foreground)]">
            {achievementTitle(t, next)}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <ProgressBar value={next.progress} trackClassName="w-28" />
            <span className="text-[11px] tabular-nums text-[var(--muted-foreground)]">
              {achievementValueLabel(next, fmt)}
            </span>
          </div>
          <AchievementCtaLink metric={next.metric} className="mt-2.5" />
        </div>
      )}
    </Card>
  );
}
