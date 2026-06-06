"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Users, QrCodeIcon, Stamp, Gift, Heart } from "@phosphor-icons/react";
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
  // Only needs the whole-business `total`; an unfiltered first page supplies it.
  const { data: customerData } = useCustomers(businessId, {
    page: 0, search: "", segment: "all", sort: "name", sortDir: "asc",
  });
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
  const newThisWeek = stats?.new_customers_this_week ?? 0;
  const recentTransactions = txns?.transactions?.slice(0, 5) ?? [];

  // Lifetime totals + "currently loyal" (>=2 visits in the last 6 months), all
  // from get_business_achievements. Loyalty here is recency-windowed on purpose,
  // unlike the lifetime repeat-count behind the loyalty trophy.
  const totalStamps = achievements?.total_stamps_given ?? 0;
  const totalRewards = achievements?.total_rewards_redeemed ?? 0;
  const loyalCustomers = achievements?.loyal_customers_6m ?? 0;

  // Total customers reconstructs its prior-week baseline from this week's new count.
  const customersTrend = wowTrend(totalCustomers, totalCustomers - newThisWeek);

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
              title={t("dashboard.totalStamps")}
              value={totalStamps}
              icon={<Stamp className="w-4 h-4" weight="bold" />}
              tone="accent"
              change={stampsThisWeek > 0 ? t("dashboard.plusThisWeek", { count: stampsThisWeek }) : undefined}
              positive={stampsThisWeek > 0}
              delay={0}
            />
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t("dashboard.totalCustomers")}
              value={totalCustomers}
              icon={<Users className="w-4 h-4" weight="bold" />}
              tone="accent"
              change={customersTrend.change}
              positive={customersTrend.positive}
              delay={80}
            />
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t("dashboard.totalRewards")}
              value={totalRewards}
              icon={<Gift className="w-4 h-4" weight="bold" />}
              tone="accent"
              delay={160}
            />
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t("dashboard.loyalCustomers")}
              value={loyalCustomers}
              icon={<Heart className="w-4 h-4" weight="bold" />}
              tone="accent"
              subtitle={t("dashboard.loyalSubtitle")}
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
