"use client";

import { useTranslations } from "next-intl";
import {
  Users,
  UserPlus,
  ArrowsClockwise,
  Medal,
} from "@phosphor-icons/react";
import { StatCard } from "@/components/redesign";
import { wowTrend } from "@/lib/dashboard-trends";
import type { BusinessAchievementsResponse } from "@/types/transaction";

interface CustomerStatsCardsProps {
  /** Accurate business-wide count (from the paginated response's `total`). */
  totalCustomers: number;
  /** Pre-computed business-wide metrics. Undefined while loading. */
  achievements?: BusinessAchievementsResponse;
}

export function CustomerStatsCards({
  totalCustomers,
  achievements,
}: CustomerStatsCardsProps) {
  const t = useTranslations("customers.stats");

  const newLast30d = achievements?.new_customers_last_30d ?? 0;
  const newPrev30d = achievements?.new_customers_prev_30d ?? 0;
  const growth = wowTrend(newLast30d, newPrev30d);
  const repeatPct = Math.round((achievements?.repeat_rate ?? 0) * 100);
  const loyal = achievements?.loyal_customers_6m ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
      <StatCard
        title={t("totalCustomers")}
        value={totalCustomers}
        icon={<Users className="w-4 h-4" weight="bold" />}
        tone="accent"
        delay={0}
      />
      <StatCard
        title={t("newLast30d")}
        value={newLast30d}
        icon={<UserPlus className="w-4 h-4" weight="bold" />}
        tone="info"
        change={growth.change}
        positive={growth.positive}
        delay={80}
      />
      <StatCard
        title={t("repeatRate")}
        value={repeatPct}
        suffix="%"
        icon={<ArrowsClockwise className="w-4 h-4" weight="bold" />}
        tone="warning"
        delay={160}
      />
      <StatCard
        title={t("loyalCustomers")}
        value={loyal}
        subtitle={t("loyalSubtitle")}
        icon={<Medal className="w-4 h-4" weight="bold" />}
        tone="accent"
        delay={240}
      />
    </div>
  );
}

export function CustomerStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
      {[1, 2, 3, 4].map((i) => (
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
