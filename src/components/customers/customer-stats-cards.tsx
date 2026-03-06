"use client";

import { useTranslations } from "next-intl";
import {
  Users,
  ChartBar,
  UserPlus,
  Gift,
} from "@phosphor-icons/react";
import { StatCard } from "@/components/redesign";
import type { CustomerPageStats } from "@/lib/customer-stats";

interface CustomerStatsCardsProps {
  stats: CustomerPageStats;
}

export function CustomerStatsCards({ stats }: CustomerStatsCardsProps) {
  const t = useTranslations("customers.stats");

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[14px]">
      <StatCard
        title={t("totalCustomers")}
        value={stats.totalCustomers}
        icon={<Users className="w-4 h-4" weight="bold" />}
        iconBg="var(--accent-light)"
        delay={0}
      />
      <StatCard
        title={t("newThisWeek")}
        value={stats.newThisWeek}
        icon={<UserPlus className="w-4 h-4" weight="bold" />}
        iconBg="#E4F0F8"
        delay={80}
      />
      <StatCard
        title={t("stampsToday")}
        value={stats.stampsToday}
        icon={<ChartBar className="w-4 h-4" weight="bold" />}
        iconBg="var(--accent-light)"
        delay={160}
      />
      <div className="md:col-span-3 lg:col-span-1">
        <StatCard
          title={t("redemptionsThisMonth")}
          value={stats.redemptionsThisMonth}
          icon={<Gift className="w-4 h-4" weight="bold" />}
          iconBg="#FFF3E0"
          delay={240}
        />
      </div>
    </div>
  );
}

export function CustomerStatsCardsSkeleton() {
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
