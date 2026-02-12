"use client";

import { useTranslations } from "next-intl";
import {
  StampIcon,
  GiftIcon,
  ChartLineUpIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { StatCardSmall } from "@/components/reusables/stats/StatCardSmall";
import type { ActivityStatsResponse } from "@/types";

interface ActivityStatsBarProps {
  stats: ActivityStatsResponse | undefined;
  isLoading: boolean;
}

export function ActivityStatsBar({ stats, isLoading }: ActivityStatsBarProps) {
  const t = useTranslations("activity");

  if (isLoading) {
    return <ActivityStatsBarSkeleton />;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCardSmall
        icon={<StampIcon size={20} weight="duotone" />}
        label={t("stats.stampsToday")}
        value={stats?.stamps_today ?? 0}
        highlight={!!stats?.stamps_today}
      />
      <StatCardSmall
        icon={<GiftIcon size={20} weight="duotone" />}
        label={t("stats.rewardsToday")}
        value={stats?.rewards_today ?? 0}
        highlight={!!stats?.rewards_today}
      />
      <StatCardSmall
        icon={<ChartLineUpIcon size={20} weight="duotone" />}
        label={t("stats.totalThisWeek")}
        value={stats?.total_this_week ?? 0}
      />
      <StatCardSmall
        icon={<UsersIcon size={20} weight="duotone" />}
        label={t("stats.activeCustomersToday")}
        value={stats?.active_customers_today ?? 0}
      />
    </div>
  );
}

function ActivityStatsBarSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--cream)]"
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--muted)] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-12 bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-3 w-20 bg-[var(--muted)] rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
