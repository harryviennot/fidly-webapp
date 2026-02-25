"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  QrCode,
  CreditCard,
  Gift,
} from "@phosphor-icons/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
  PeakHoursChart,
  QuickActions,
  ChartCard,
  LegendItem,
} from "@/components/redesign";

// Placeholder chart data (will be wired to real analytics later)
const SCAN_CHART_DATA = [
  { day: "Mon", scans: 34, stamps: 28, redemptions: 3 },
  { day: "Tue", scans: 45, stamps: 38, redemptions: 5 },
  { day: "Wed", scans: 52, stamps: 44, redemptions: 6 },
  { day: "Thu", scans: 38, stamps: 30, redemptions: 4 },
  { day: "Fri", scans: 67, stamps: 58, redemptions: 8 },
  { day: "Sat", scans: 89, stamps: 76, redemptions: 11 },
  { day: "Sun", scans: 72, stamps: 61, redemptions: 9 },
];

export default function DashboardPage() {
  const t = useTranslations();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;

  // Data hooks
  const { data: customerData } = useCustomers(businessId, 0);
  const { data: stats } = useActivityStats(businessId);
  const { data: txns } = useTransactions(businessId, 10);
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

  const displayName = profile?.name || "there";

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: "150ms" }}>
      {/* Header */}
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.welcome", { name: displayName })}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px]">
        <StatCard
          title={t("dashboard.totalCustomers")}
          value={totalCustomers}
          icon={<Users className="w-4 h-4" weight="bold" />}
          iconBg="#E8F5E4"
          subtitle={t("dashboard.vsLastMonth")}
          change="+18%"
          positive
          delay={0}
        />
        <StatCard
          title={t("dashboard.scansToday")}
          value={activeCustomersToday}
          icon={<QrCode className="w-4 h-4" weight="bold" />}
          iconBg="#E4F0E4"
          subtitle={t("dashboard.vsYesterday")}
          change="+12%"
          positive
          delay={80}
        />
        <StatCard
          title={t("dashboard.activeCards")}
          value={totalCustomers}
          icon={<CreditCard className="w-4 h-4" weight="bold" />}
          iconBg="#F0EDE7"
          subtitle={t("dashboard.installRate87")}
          change="+8%"
          positive
          delay={160}
        />
        <StatCard
          title={t("dashboard.redemptions")}
          value={rewardsToday}
          icon={<Gift className="w-4 h-4" weight="bold" />}
          iconBg="#FFF3E0"
          subtitle={t("dashboard.thisWeek")}
          change="+23%"
          positive
          delay={240}
        />
      </div>

      {/* Two-column layout */}
      <div className="flex gap-[14px] flex-col lg:flex-row">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-[14px] min-w-0">
          {/* Scan Activity Chart */}
          <ChartCard
            title={t("dashboard.scanActivity")}
            delay={300}
            legend={
              <div className="flex items-center gap-3">
                <LegendItem color="#A8C5A8" label={t("dashboard.scans")} />
                <LegendItem color="#4A6B4A" label={t("dashboard.stamps")} />
                <LegendItem color="#C4A67D" label={t("dashboard.redemptions")} />
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
                  fill="#A8C5A8"
                  radius={[3, 3, 0, 0]}
                  animationDuration={800}
                />
                <Bar
                  dataKey="stamps"
                  fill="#4A6B4A"
                  radius={[3, 3, 0, 0]}
                  animationDuration={800}
                  animationBegin={150}
                />
                <Bar
                  dataKey="redemptions"
                  fill="#C4A67D"
                  radius={[3, 3, 0, 0]}
                  animationDuration={800}
                  animationBegin={300}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Recent Scans */}
          <RecentScans
            transactions={recentTransactions}
            delay={400}
          />
        </div>

        {/* Right column */}
        <div
          className="w-full lg:w-[290px] lg:min-w-[290px] flex flex-col gap-[14px] animate-slide-up"
          style={{ animationDelay: "350ms" }}
        >
          <ActiveCardWidget
            design={activeDesign}
            totalCustomers={totalCustomers}
            activeCards={totalCustomers}
            delay={0}
          />
          <PeakHoursChart delay={100} />
          <QuickActions delay={200} />
        </div>
      </div>
    </div>
  );
}
