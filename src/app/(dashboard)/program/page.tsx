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
import { QuickActions } from '@/components/program/QuickActions';
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

      {/* Main content: 2-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Summary + Enrollment */}
        <div className="lg:col-span-2 space-y-6">
          <ProgramSummaryCard program={program} />
          <EnrollmentSnapshot totalStamps={program?.config?.total_stamps ?? 10} />
        </div>

        {/* Right column: Active card + Quick actions */}
        <div className="space-y-6">
          <div className="max-w-xs lg:max-w-none">
            <ActiveCardWidget design={activeDesign} isProPlan={isProPlan} />
          </div>
          <QuickActions activeDesign={activeDesign} />
        </div>
      </div>

      {/* Setup checklist */}
      <SetupChecklist
        program={program}
        activeDesign={activeDesign}
        designs={designs}
        totalCustomers={totalCustomers}
      />
    </div>
  );
}
