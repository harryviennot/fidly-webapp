'use client';

import { useTranslations } from 'next-intl';
import { useProgram } from './layout';
import { useBusiness } from '@/contexts/business-context';
import { useCustomers } from '@/hooks/use-customers';
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

  // Reuse cached customer data (page 0) for total count
  const { data: customerData } = useCustomers(currentBusiness?.id, 0);
  const totalCustomers = customerData?.total ?? 0;

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

        {/* Right column: Active card — fixed width, sticky */}
        <div className="w-full max-w-[400px] max-lg:max-w-[400px] flex-shrink-0">
          <div className="lg:sticky lg:top-6">
            <ActiveCardWidget design={activeDesign} isProPlan={isProPlan} />
          </div>
        </div>
      </div>
    </div>
  );
}
