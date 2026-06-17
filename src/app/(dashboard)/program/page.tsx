'use client';

import { useTranslations } from 'next-intl';
import { useProgram } from './layout';
import { BusinessUrlCard } from '@/components/program/BusinessUrlCard';
import { ProgramSummaryCard } from '@/components/program/ProgramSummaryCard';
import { ProgramHealthCard } from '@/components/program/ProgramHealthCard';
import { OverviewPageSkeleton } from '@/components/loyalty-program/skeletons/OverviewPageSkeleton';
import { PageHeader, ActiveCardWidget } from '@/components/redesign';

/**
 * Loyalty Program control center. Three stacked jobs, mobile-first:
 *   1. Share & grow      — BusinessUrlCard (QR + link)
 *   2. (the card itself) — ActiveCardWidget, program-specific (edit / switch)
 *   3. Program health    — ProgramHealthCard (effectiveness metrics)
 *   4. Set up & manage   — ProgramSummaryCard (real config at a glance)
 *
 * Explicit grid placement lets mobile lead with Share & grow (order-*) while
 * desktop keeps the card preview in a 290px right rail (col/row-start).
 */
export default function ProgramOverviewPage() {
  const { program, activeDesign, loading, isOwner } = useProgram();
  const t = useTranslations('loyaltyProgram.overview');

  if (loading) {
    return <OverviewPageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: '150ms' }}>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid grid-cols-1 min-[1080px]:grid-cols-[minmax(0,1fr)_290px] gap-[14px] items-start">
        {/* Job 1 — Share & grow (mobile: first) */}
        <div className="order-1 min-[1080px]:col-start-1 min-[1080px]:row-start-1">
          <BusinessUrlCard delay={0} />
        </div>

        {/* The card itself — program-specific (mobile: second; desktop: right rail) */}
        <div className="order-2 min-[1080px]:col-start-2 min-[1080px]:row-start-1">
          <ActiveCardWidget
            design={activeDesign ?? null}
            isOwner={isOwner}
            showStats={false}
            switchTemplateHref="/program/templates"
            delay={80}
          />
        </div>

        {/* Job 2 — Program health */}
        <div className="order-3 min-[1080px]:col-start-1 min-[1080px]:row-start-2">
          <ProgramHealthCard delay={160} />
        </div>

        {/* Job 3 — Set up & manage */}
        <div className="order-4 min-[1080px]:col-start-1 min-[1080px]:row-start-3">
          <ProgramSummaryCard program={program} delay={240} isOwner={isOwner} />
        </div>
      </div>
    </div>
  );
}
