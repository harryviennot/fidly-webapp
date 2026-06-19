'use client';

import { useTranslations } from 'next-intl';
import { useProgram } from './layout';
import { BusinessUrlCard } from '@/components/program/BusinessUrlCard';
import { CounterFlyerCard } from '@/components/program/CounterFlyerCard';
import { ProgramSummaryCard } from '@/components/program/ProgramSummaryCard';
import { ProgramHealthCard } from '@/components/program/ProgramHealthCard';
import { OverviewPageSkeleton } from '@/components/loyalty-program/skeletons/OverviewPageSkeleton';
import { PageHeader, ActiveCardWidget } from '@/components/redesign';

/**
 * Loyalty Program control center, mobile-first.
 *
 * Mobile order (single column, via order-*):
 *   1. Share & grow    — BusinessUrlCard (QR + link)
 *   2. The card itself — ActiveCardWidget (preview + edit / switch)
 *   3. Program health  — ProgramHealthCard (effectiveness metrics)
 *   4. Set up & manage — ProgramSummaryCard (real config at a glance)
 *
 * Desktop (>=1080px): two independent columns. The column wrappers are
 * `display:contents` on mobile (so their cards flow into one ordered stack) and
 * become flex columns on desktop — that keeps column heights independent (no
 * shared grid-row gaps). Left = link + config, right rail = card + health.
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

      <div className="flex flex-col gap-[14px] min-[1080px]:grid min-[1080px]:grid-cols-[minmax(0,1fr)_290px] min-[1080px]:items-start">
        {/* Left column: Share & grow + Set up & manage */}
        <div className="contents min-[1080px]:flex min-[1080px]:flex-col min-[1080px]:gap-[14px]">
          <div className="order-1 flex flex-col gap-[14px]">
            <BusinessUrlCard delay={0} />
            <CounterFlyerCard delay={120} />
          </div>
          <div className="order-4">
            <ProgramSummaryCard program={program} delay={240} isOwner={isOwner} />
          </div>
        </div>

        {/* Right rail: the card itself + program health */}
        <div className="contents min-[1080px]:flex min-[1080px]:flex-col min-[1080px]:gap-[14px]">
          <div className="order-2">
            <ActiveCardWidget
              design={activeDesign ?? null}
              isOwner={isOwner}
              showStats={false}
              switchTemplateHref="/program/templates"
              delay={80}
            />
          </div>
          <div className="order-3">
            <ProgramHealthCard delay={160} />
          </div>
        </div>
      </div>
    </div>
  );
}
