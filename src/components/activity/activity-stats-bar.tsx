"use client";

import { useTranslations } from "next-intl";
import {
  Stamp,
  Gift,
  ChartBar,
  DeviceMobileCamera,
} from "@phosphor-icons/react";
import { StatCard } from "@/components/redesign";
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[14px]">
      <StatCard
        title={t("stats.stampsToday")}
        value={stats?.stamps_today ?? 0}
        icon={<Stamp className="w-4 h-4" weight="bold" />}
        iconBg="#E8F5E4"
        delay={0}
      />
      <StatCard
        title={t("stats.rewardsToday")}
        value={stats?.rewards_today ?? 0}
        icon={<Gift className="w-4 h-4" weight="bold" />}
        iconBg="#FFF3E0"
        delay={80}
      />
      <StatCard
        title={t("stats.totalThisWeek")}
        value={stats?.total_this_week ?? 0}
        icon={<ChartBar className="w-4 h-4" weight="bold" />}
        iconBg="#E4F0E4"
        delay={160}
      />
      <div className="md:col-span-3 lg:col-span-1">
        <StatCard
          title={t("stats.activeCustomersToday")}
          value={stats?.active_customers_today ?? 0}
          icon={<DeviceMobileCamera className="w-4 h-4" weight="bold" />}
          iconBg="#E4F0F8"
          delay={240}
        />
      </div>
    </div>
  );
}

function ActivityStatsBarSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[14px]">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-[16px_18px] ${i === 4 ? "md:col-span-3 lg:col-span-1" : ""}`}
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
