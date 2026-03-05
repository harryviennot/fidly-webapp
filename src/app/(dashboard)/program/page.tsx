'use client';

import { useTranslations } from 'next-intl';
import { useProgram } from './layout';
import { useBusiness } from '@/contexts/business-context';
import { useCustomers } from '@/hooks/use-customers';
import { useActivityStats } from '@/hooks/use-activity-stats';
import {
  StampIcon,
  GiftIcon,
  CreditCardIcon,
} from '@phosphor-icons/react';
import { SetupChecklist } from '@/components/program/SetupChecklist';
import { BusinessUrlCard } from '@/components/program/BusinessUrlCard';
import { ProgramSummaryCard } from '@/components/program/ProgramSummaryCard';
import { OverviewPageSkeleton } from '@/components/loyalty-program/skeletons/OverviewPageSkeleton';
import {
  PageHeader,
  StatCard,
  ActiveCardWidget,
} from '@/components/redesign';

export default function ProgramOverviewPage() {
  const { program, designs, activeDesign, loading } = useProgram();
  const { currentBusiness } = useBusiness();
  const t = useTranslations('loyaltyProgram.overview');

  const { data: customerData } = useCustomers(currentBusiness?.id, 0);
  const totalCustomers = customerData?.total ?? 0;
  const { data: stats } = useActivityStats(currentBusiness?.id);

  if (loading) {
    return <OverviewPageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: '150ms' }}>
      {/* Header */}
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {/* Setup checklist */}
      <SetupChecklist
        program={program}
        activeDesign={activeDesign}
        designs={designs}
        totalCustomers={totalCustomers}
        delay={0}
      />

      {/* Two-column layout */}
      <div className="flex gap-[14px] flex-col min-[1080px]:flex-row min-[1080px]:items-start">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-[14px] min-w-0">
          {/* Stat cards */}
          <div className="flex flex-wrap gap-[14px]">
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t('totalStampsGiven')}
              value={stats?.stamps_today ?? 0}
              icon={<StampIcon className="w-4 h-4" weight="bold" />}
              iconBg="#E8F5E4"
              subtitle={t('allTime')}
              change="+22%"
              positive
              delay={0}
            />
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t('rewardsRedeemed')}
              value={stats?.rewards_today ?? 0}
              icon={<GiftIcon className="w-4 h-4" weight="bold" />}
              iconBg="#FFF3E0"
              subtitle={t('allTime')}
              change="+15%"
              positive
              delay={80}
            />
            <StatCard
              className="flex-1 basis-0 min-w-[140px]"
              title={t('activeCards')}
              value={totalCustomers}
              icon={<CreditCardIcon className="w-4 h-4" weight="bold" />}
              iconBg="#E4F0F8"
              subtitle={`87% ${t('installRate')}`}
              change="+8%"
              positive
              delay={160}
            />
          </div>

          {/* Business URL / QR Code */}
          <BusinessUrlCard delay={240} />

          {/* Program Configuration Summary */}
          <ProgramSummaryCard program={program} delay={300} />
        </div>

        {/* Right column */}
        <div
          className="w-full min-[1080px]:w-[290px] min-[1080px]:min-w-[290px] flex flex-col gap-[14px] animate-slide-up"
          style={{ animationDelay: '350ms' }}
        >
          {/* Active Card Preview */}
          <ActiveCardWidget
            design={activeDesign ?? null}
            totalCustomers={totalCustomers}
            activeCards={totalCustomers}
            delay={0}
          />

          {/* Program Health */}
          <ProgramHealthCard delay={100} />

          {/* Quick Actions */}
          <OverviewQuickActions delay={200} />
        </div>
      </div>
    </div>
  );
}

/* ── Program Health Card ── */
function ProgramHealthCard({ delay = 0 }: { delay?: number }) {
  const t = useTranslations('loyaltyProgram.overview');

  const metrics = [
    { label: t('avgStampsPerCustomer'), value: '3.9', color: '#4A7C59' },
    { label: t('rewardCompletionRate'), value: '15%', color: '#C4883D' },
    { label: t('thirtyDayRetention'), value: '72%', color: '#4A7C59' },
    { label: t('avgTimeToReward'), value: '18 days', color: '#555' },
  ];

  return (
    <div
      className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px] animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-[15px] font-semibold text-[#1A1A1A] mb-3.5">
        {t('programHealth')}
      </div>
      {metrics.map((m, i) => (
        <div
          key={i}
          className="flex justify-between items-center py-[9px]"
          style={{ borderBottom: i < metrics.length - 1 ? '1px solid var(--border-light)' : 'none' }}
        >
          <span className="text-[12px] text-[#8A8A8A]">{m.label}</span>
          <span className="text-[13px] font-semibold" style={{ color: m.color }}>{m.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Quick Actions (Overview variant) ── */
function OverviewQuickActions({ delay = 0 }: { delay?: number }) {
  const t = useTranslations('loyaltyProgram.overview');

  const actions = [
    { label: t('downloadQrPoster'), desc: t('downloadQrPosterDesc'), emoji: '🖨️' },
    { label: t('testYourCard'), desc: t('testYourCardDesc'), emoji: '🧪' },
    { label: t('shareLink'), desc: t('shareLinkDesc'), emoji: '🔗' },
  ];

  return (
    <div
      className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-[13px] font-semibold text-[#1A1A1A] mb-2.5">
        {t('quickActions')}
      </div>
      {actions.map((a, i) => (
        <button
          key={i}
          className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-[var(--border)] bg-white cursor-pointer text-left transition-colors duration-[120ms] hover:bg-[var(--border-light)]"
          style={{ marginBottom: i < actions.length - 1 ? 6 : 0 }}
        >
          <span className="text-[18px]">{a.emoji}</span>
          <div>
            <div className="text-[12px] font-medium text-[#333]">{a.label}</div>
            <div className="text-[10px] text-[#A5A5A5]">{a.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
