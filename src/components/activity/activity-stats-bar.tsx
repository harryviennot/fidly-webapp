"use client";

import { useTranslations, useLocale } from "next-intl";
import { ChartBar, TrendUp, Trophy } from "@phosphor-icons/react";
import { StatCard } from "@/components/redesign";
import type { ActivityStatsResponse } from "@/types";

interface ActivityStatsBarProps {
  stats: ActivityStatsResponse | undefined;
  isLoading: boolean;
}

/** Format a YYYY-MM-DD date into a short, locale-aware "Sat 25 Apr" label.
 *  Parses the parts manually so a date-only string isn't shifted by timezone. */
function formatBestDay(date: string | null | undefined, locale: string): string | null {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(y, m - 1, d));
}

export function ActivityStatsBar({ stats, isLoading }: ActivityStatsBarProps) {
  const t = useTranslations("activity");
  const locale = useLocale();

  if (isLoading) {
    return <ActivityStatsBarSkeleton />;
  }

  // Today's activity = the live pulse, compared to a typical day. We only ever
  // surface a (green) ▲ once today has beaten the typical day — never a red ▼,
  // since an in-progress day would otherwise read as "down" every morning.
  const todayTotal = (stats?.stamps_today ?? 0) + (stats?.rewards_today ?? 0);
  const typicalAvg = Math.round(stats?.avg_daily_activity ?? 0);
  const beatsTypical = typicalAvg > 0 && todayTotal > typicalAvg;

  // This week vs last week to-date (like-for-like, so the ▲/▼ is honest).
  const thisWeek = stats?.total_this_week ?? 0;
  const prevWtd = stats?.total_prev_week_to_date ?? 0;
  const weekDelta = thisWeek - prevWtd;
  const showWeekTrend = prevWtd > 0 || thisWeek > 0;

  const bestDayCount = stats?.best_day_count ?? 0;
  const bestDayLabel = formatBestDay(stats?.best_day_date, locale);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px]">
      <StatCard
        title={t("stats.todayActivity")}
        info={typicalAvg > 0 ? t("stats.todayActivityInfo", { avg: typicalAvg }) : undefined}
        value={todayTotal}
        subtitle={typicalAvg > 0 ? t("stats.typicalPerDay", { avg: typicalAvg }) : undefined}
        change={beatsTypical ? `+${todayTotal - typicalAvg}` : undefined}
        positive={beatsTypical || undefined}
        icon={<ChartBar className="w-4 h-4" weight="bold" />}
        tone="accent"
        delay={0}
      />
      <StatCard
        title={t("stats.thisWeek")}
        value={thisWeek}
        subtitle={t("stats.vsLastWeek")}
        change={showWeekTrend ? `${weekDelta >= 0 ? "+" : ""}${weekDelta}` : undefined}
        positive={weekDelta >= 0}
        icon={<TrendUp className="w-4 h-4" weight="bold" />}
        tone="accent"
        delay={80}
      />
      <StatCard
        title={t("stats.bestDay")}
        value={bestDayCount}
        subtitle={bestDayLabel ?? undefined}
        icon={<Trophy className="w-4 h-4" weight="bold" />}
        tone="warning"
        delay={160}
      />
    </div>
  );
}

function ActivityStatsBarSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px]">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-[16px_18px]"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--muted)] animate-pulse" />
            <div className="h-3 w-20 bg-[var(--muted)] rounded animate-pulse" />
          </div>
          <div className="h-7 w-14 bg-[var(--muted)] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
