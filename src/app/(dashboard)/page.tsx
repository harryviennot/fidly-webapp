"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  QrCodeIcon,
  CreditCard,
  Gift,
} from "@phosphor-icons/react";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
// } from "recharts";
import { useBusiness } from "@/contexts/business-context";
import { useCustomers } from "@/hooks/use-customers";
import { useActivityStats } from "@/hooks/use-activity-stats";
import { useTransactions } from "@/hooks/use-transactions";
import { useActiveDesign } from "@/hooks/use-designs";
import { getMyProfile } from "@/api";
import type { User } from "@/types";
import {
  PageHeader,
  StatCard,
  RecentScans,
  ActiveCardWidget,
  // PeakHoursChart,
  QuickActions,
  // ChartCard,
  // LegendItem,
} from "@/components/redesign";
import { computeCardColors } from "@/lib/card-utils";
import type { StampIconType } from "@/components/design/StampIconPicker";

// Placeholder chart data (will be wired to real analytics later)
// const SCAN_CHART_DATA = [
//   { day: "Mon", scans: 34, stamps: 28, redemptions: 3 },
//   { day: "Tue", scans: 45, stamps: 38, redemptions: 5 },
//   { day: "Wed", scans: 52, stamps: 44, redemptions: 6 },
//   { day: "Thu", scans: 38, stamps: 30, redemptions: 4 },
//   { day: "Fri", scans: 67, stamps: 58, redemptions: 8 },
//   { day: "Sat", scans: 89, stamps: 76, redemptions: 11 },
//   { day: "Sun", scans: 72, stamps: 61, redemptions: 9 },
// ];

export default function DashboardPage() {
  const t = useTranslations();
  const { currentBusiness, currentRole } = useBusiness();
  const businessId = currentBusiness?.id;

  // Data hooks
  const { data: customerData } = useCustomers(businessId, 0);
  const { data: stats } = useActivityStats(businessId);
  const { data: txns, isLoading: txnsLoading } = useTransactions(businessId, 10);
  const { data: activeDesign } = useActiveDesign(businessId);

  // User profile for welcome message
  const [profile, setProfile] = useState<User | null>(null);
  useEffect(() => {
    getMyProfile().then(setProfile).catch(console.error);
  }, []);

  const totalCustomers = customerData?.total ?? 0;
  const rewardsToday = stats?.rewards_today ?? 0;
  const activeCustomersToday = stats?.active_customers_today ?? 0;
  const recentTransactions = txns?.transactions?.slice(0, 6) ?? [];
  const colors = activeDesign ? computeCardColors(activeDesign) : null;
  const stampIcon = (activeDesign?.stamp_icon as StampIconType) ?? undefined;
  const rewardIcon = (activeDesign?.reward_icon as StampIconType) ?? undefined;

  const displayName = profile?.name || "there";

  // Read accent palette from CSS vars for Recharts (SVG attrs don't support CSS vars directly)
  // const cssStyle = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  // const accentColor = cssStyle?.getPropertyValue("--accent").trim() || "#f97316";
  // const accent300 = cssStyle?.getPropertyValue("--accent-300").trim() || "#fdba74";
  // const secondaryColor = cssStyle?.getPropertyValue("--business-secondary").trim() || "#C4A67D";

  console.log("NEXT_PUBLIC_SCAN_URL", process.env.NEXT_PUBLIC_SCAN_URL);
  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: "150ms" }}>
      {/* Header */}
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.welcome", { name: displayName })}
        actions={process.env.NEXT_PUBLIC_SCAN_URL ? [
          {
            label: t("dashboard.openScanner"),
            icon: <QrCodeIcon className="w-4 h-4" weight="bold" />,
            href: process.env.NEXT_PUBLIC_SCAN_URL,
            variant: "secondary",
          },
        ] : undefined}
      />

      {/* Two-column layout — right column starts at top alongside stat cards */}
      <div className="flex gap-[14px] flex-col min-[1080px]:flex-row min-[1080px]:items-start">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-[14px] min-w-0">
          {/* Stat cards — inside left column so right panel aligns from top */}
          <div className="flex flex-wrap gap-[14px]">
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t("dashboard.totalCustomers")}
              value={totalCustomers}
              icon={<Users className="w-4 h-4" weight="bold" />}
              iconBg="var(--accent-light)"
              // subtitle={t("dashboard.vsLastMonth")}
              // change="+18%"
              // positive
              delay={0}
            />
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t("dashboard.scansToday")}
              value={activeCustomersToday}
              icon={<QrCodeIcon className="w-4 h-4" weight="bold" />}
              iconBg="var(--accent-light)"
              // subtitle={t("dashboard.vsYesterday")}
              // change="+12%"
              // positive
              delay={80}
            />
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t("dashboard.activeCards")}
              value={totalCustomers}
              icon={<CreditCard className="w-4 h-4" weight="bold" />}
              iconBg="#F0EDE7"
              // subtitle={t("dashboard.installRate87")}
              // change="+8%"
              // positive
              delay={160}
            />
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t("dashboard.redemptions")}
              value={rewardsToday}
              icon={<Gift className="w-4 h-4" weight="bold" />}
              iconBg="#FFF3E0"
              // subtitle={t("dashboard.thisWeek")}
              // change="+23%"
              // positive
              delay={240}
            />
          </div>

          {/* Scan Activity Chart */}

          {/* 
          <ChartCard
            title={t("dashboard.scanActivity")}
            delay={300}
            legend={
              <div className="flex items-center gap-3">
                <LegendItem color={accent300} label={t("dashboard.scans")} />
                <LegendItem color={accentColor} label={t("dashboard.stamps")} />
                <LegendItem color={secondaryColor} label={t("dashboard.redemptions")} />
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={SCAN_CHART_DATA} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#AAA" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#AAA" }}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #eee",
                    fontSize: 11,
                  }}
                  cursor={{ fill: "rgba(0,0,0,0.02)" }}
                />
                <Bar
                  dataKey="scans"
                  fill={accent300}
                  radius={[3, 3, 0, 0]}
                  animationDuration={800}
                />
                <Bar
                  dataKey="stamps"
                  fill={accentColor}
                  radius={[3, 3, 0, 0]}
                  animationDuration={800}
                  animationBegin={150}
                />
                <Bar
                  dataKey="redemptions"
                  fill={secondaryColor}
                  radius={[3, 3, 0, 0]}
                  animationDuration={800}
                  animationBegin={300}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard> */}

          {/* Recent Scans */}
          <RecentScans
            transactions={recentTransactions}
            loading={txnsLoading}
            delay={400}
            stampIcon={stampIcon}
            rewardIcon={rewardIcon}
            stampFilledColor={colors?.accentHex}
            iconColor={colors?.iconColorHex}
          />
        </div>

        {/* Right column — starts at top */}
        <div
          className="w-full min-[1080px]:w-[290px] min-[1080px]:min-w-[290px] flex flex-col gap-[14px] animate-slide-up"
          style={{ animationDelay: "350ms" }}
        >
          <ActiveCardWidget
            design={activeDesign}
            totalCustomers={totalCustomers}
            activeCards={totalCustomers}
            isOwner={currentRole === "owner"}
            delay={0}
          />
          {/* <PeakHoursChart delay={100} /> */}
          <QuickActions delay={200} />
        </div>
      </div>
    </div>
  );
}
