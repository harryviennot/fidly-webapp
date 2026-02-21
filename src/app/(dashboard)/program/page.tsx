'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useProgram } from './layout';
import { useBusiness } from '@/contexts/business-context';
import { getCustomers } from '@/api';
import { ActiveCardWidget } from '@/components/loyalty-program/overview/ActiveCardWidget';
import { ProgramSummaryCard } from '@/components/program/ProgramSummaryCard';
import { EnrollmentSnapshot } from '@/components/program/EnrollmentSnapshot';
import { SetupChecklist } from '@/components/program/SetupChecklist';
import { BusinessUrlCard } from '@/components/program/BusinessUrlCard';
import { OverviewPageSkeleton } from '@/components/loyalty-program/skeletons/OverviewPageSkeleton';

export default function ProgramOverviewPage() {
  const { program, designs, activeDesign, loading, isProPlan } = useProgram();
  const { currentBusiness } = useBusiness();
  const t = useTranslations('loyaltyProgram.overview');
  const [totalCustomers, setTotalCustomers] = useState(0);

  useEffect(() => {
    if (!currentBusiness?.id) return;
    let cancelled = false;
    getCustomers(currentBusiness.id, 1, 0)
      .then((data) => {
        if (!cancelled) setTotalCustomers(data.total);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentBusiness?.id]);

  if (loading) {
    return <OverviewPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Setup checklist — top of page for new users */}
      <SetupChecklist
        program={program}
        activeDesign={activeDesign}
        designs={designs}
        totalCustomers={totalCustomers}
      />

      {/* Main content: left fills, right fixed-width card */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column: Summary + URL + Enrollment */}
        <div className="flex-1 min-w-0 space-y-6">
          <ProgramSummaryCard program={program} />
          <BusinessUrlCard />
          <EnrollmentSnapshot totalStamps={program?.config?.total_stamps ?? 10} />
        </div>

        {/* Right column: Active card + Quick actions — fixed width, sticky */}
        <div className="w-full max-w-[400px] max-lg:max-w-[400px] flex-shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            <ActiveCardWidget design={activeDesign} isProPlan={isProPlan} />
            <QuickActions activeDesign={activeDesign} />
          </div>
        </div>
      </div>
    </div>
  );
}
