"use client";

import { useTranslations } from "next-intl";
import {
  UsersIcon,
  UserPlusIcon,
  StampIcon,
  GiftIcon,
} from "@phosphor-icons/react";
import { StatCardSmall } from "@/components/reusables/stats/StatCardSmall";
import type { CustomerPageStats } from "@/lib/customer-stats";

interface CustomerStatsCardsProps {
  stats: CustomerPageStats;
}

export function CustomerStatsCards({ stats }: CustomerStatsCardsProps) {
  const t = useTranslations("customers.stats");

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCardSmall
        icon={<UsersIcon size={20} weight="duotone" />}
        label={t("totalCustomers")}
        value={stats.totalCustomers}
      />
      <StatCardSmall
        icon={<UserPlusIcon size={20} weight="duotone" />}
        label={t("newThisWeek")}
        value={stats.newThisWeek}
        highlight={stats.newThisWeek > 0}
      />
      <StatCardSmall
        icon={<StampIcon size={20} weight="duotone" />}
        label={t("stampsToday")}
        value={stats.stampsToday}
      />
      <StatCardSmall
        icon={<GiftIcon size={20} weight="duotone" />}
        label={t("redemptionsThisMonth")}
        value={stats.redemptionsThisMonth}
        highlight={stats.redemptionsThisMonth > 0}
      />
    </div>
  );
}

export function CustomerStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--cream)]"
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--muted)] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-12 bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-4 w-20 bg-[var(--muted)] rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
