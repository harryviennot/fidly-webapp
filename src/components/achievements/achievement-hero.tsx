"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { CompletionRing } from "@/components/reusables/completion-ring";
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

  const now = new Date();
  const earnedThisMonth = computed.all.filter((a) => {
    if (!a.unlocked || !a.unlockedAt) return false;
    const d = new Date(a.unlockedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

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
          {earnedThisMonth > 0 && (
            <p className="mt-0.5 text-[12.5px] text-[var(--muted-foreground)]">
              {t("hero.earnedThisMonth", { count: earnedThisMonth })}
            </p>
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
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
                style={{ width: `${Math.round(next.progress * 100)}%` }}
              />
            </div>
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
