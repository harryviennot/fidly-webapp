"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Users, QrCodeIcon, CreditCard, Stamp, Repeat } from "@phosphor-icons/react";
import { useBusiness } from "@/contexts/business-context";
import { useCustomers } from "@/hooks/use-customers";
import { useActivityStats } from "@/hooks/use-activity-stats";
import { useTransactions } from "@/hooks/use-transactions";
import { useDesigns } from "@/hooks/use-designs";
import { useBusinessAchievements } from "@/hooks/use-business-achievements";
import { getMyProfile } from "@/api";
import type { User } from "@/types";
import {
  PageHeader,
  StatCard,
  RecentScans,
  ActiveCardWidget,
  QuickActions,
} from "@/components/redesign";
import { AchievementsWidget } from "@/components/achievements";
import { computeCardColors } from "@/lib/card-utils";
import { wowTrend } from "@/lib/dashboard-trends";
import type { StampIconType } from "@/components/design/StampIconPicker";

export default function DashboardPage() {
  const t = useTranslations();
  const { currentBusiness, currentRole } = useBusiness();
  const businessId = currentBusiness?.id;

  // Data hooks
  const { data: customerData } = useCustomers(businessId, 0);
  const { data: stats } = useActivityStats(businessId);
  const { data: txns, isLoading: txnsLoading } = useTransactions(businessId, 10);
  const { data: designs = [] } = useDesigns(businessId);
  const { data: achievements } = useBusinessAchievements(businessId);
  const activeDesign = designs.find((d) => d.is_active);

  // User profile for welcome message
  const [profile, setProfile] = useState<User | null>(null);
  useEffect(() => {
    getMyProfile().then(setProfile).catch(console.error);
  }, []);

  const totalCustomers = customerData?.total ?? 0;
  const activeCards = stats?.active_cards ?? 0;
  const stampsThisWeek = stats?.stamps_this_week ?? 0;
  const stampsToday = stats?.stamps_today ?? 0;
  const newThisWeek = stats?.new_customers_this_week ?? 0;
  const recentTransactions = txns?.transactions?.slice(0, 5) ?? [];
  const installRate =
    totalCustomers > 0 ? Math.round((activeCards / totalCustomers) * 100) : 0;
  // Repeat rate is the loyalty north-star. Sourced from get_business_achievements;
  // shown as a level (no WoW arrow — there is no prior-week baseline to compare).
  const repeatRatePct = Math.round((achievements?.repeat_rate ?? 0) * 100);

  // Week-over-week trends (see web/docs/dashboard-achievements.md).
  // Total customers reconstructs its prior baseline from this week's new count.
  const customersTrend = wowTrend(totalCustomers, totalCustomers - newThisWeek);
  const stampsTrend = wowTrend(stampsThisWeek, stats?.stamps_prev_week ?? 0);

  const colors = activeDesign ? computeCardColors(activeDesign) : null;
  const stampIcon = (activeDesign?.stamp_icon as StampIconType) ?? undefined;
  const rewardIcon = (activeDesign?.reward_icon as StampIconType) ?? undefined;

  const displayName = profile?.name || "there";

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: "150ms" }}>
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.welcome", { name: displayName })}
        actions={process.env.NEXT_PUBLIC_SCAN_URL ? [
          {
            label: t("dashboard.openScanner"),
            icon: <QrCodeIcon className="w-4 h-4" weight="bold" />,
            href: process.env.NEXT_PUBLIC_SCAN_URL,
            variant: "primary",
          },
        ] : undefined}
      />

      {/* Two-column layout — right rail starts at top alongside the KPI grid */}
      <div className="flex gap-[14px] flex-col min-[1080px]:flex-row min-[1080px]:items-start">
        {/* Left column — health at a glance + a peek at recent activity */}
        <div className="flex-1 flex flex-col gap-[14px] min-w-0">
          {/* Balanced KPI grid. Daily counts ride along as subtitles so a quiet
              day never reads as an empty dashboard. */}
          <div className="flex flex-wrap gap-[14px]">
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t("dashboard.totalCustomers")}
              value={totalCustomers}
              icon={<Users className="w-4 h-4" weight="bold" />}
              tone="accent"
              change={customersTrend.change}
              positive={customersTrend.positive}
              delay={0}
            />
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t("dashboard.activeCards")}
              value={activeCards}
              icon={<CreditCard className="w-4 h-4" weight="bold" />}
              tone="info"
              subtitle={
                totalCustomers > 0
                  ? t("dashboard.installedSubtitle", { rate: installRate })
                  : undefined
              }
              delay={80}
            />
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t("dashboard.stampsThisWeek")}
              value={stampsThisWeek}
              icon={<Stamp className="w-4 h-4" weight="bold" />}
              tone="accent"
              subtitle={t("dashboard.todayCount", { count: stampsToday })}
              change={stampsTrend.change}
              positive={stampsTrend.positive}
              delay={160}
            />
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t("dashboard.repeatRate")}
              value={repeatRatePct}
              suffix="%"
              icon={<Repeat className="w-4 h-4" weight="bold" />}
              tone="info"
              delay={240}
            />
          </div>

          {/* A peek at recent activity — the full log lives on Activity */}
          <RecentScans
            transactions={recentTransactions}
            loading={txnsLoading}
            delay={320}
            stampIcon={stampIcon}
            rewardIcon={rewardIcon}
            stampFilledColor={colors?.accentHex}
            iconColor={colors?.iconColorHex}
          />
        </div>

        {/* Right rail — achievements centerpiece up top */}
        <div
          className="w-full min-[1080px]:w-[290px] min-[1080px]:min-w-[290px] flex flex-col gap-[14px] animate-slide-up"
          style={{ animationDelay: "350ms" }}
        >
          <AchievementsWidget delay={0} />
          <ActiveCardWidget
            design={activeDesign}
            totalCustomers={totalCustomers}
            activeCards={activeCards}
            isOwner={currentRole === "owner"}
            delay={100}
          />
          <QuickActions delay={200} />
        </div>
      </div>
    </div>
  );
}
