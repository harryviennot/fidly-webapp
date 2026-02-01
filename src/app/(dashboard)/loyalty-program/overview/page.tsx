'use client';

import { useLoyaltyProgram } from '../layout';
import { ActiveCardWidget } from '@/components/loyalty-program/overview/ActiveCardWidget';
import { QuickStatsGrid } from '@/components/loyalty-program/overview/QuickStatsGrid';
import { StatusIndicators } from '@/components/loyalty-program/overview/StatusIndicators';
import { OverviewPageSkeleton } from '@/components/loyalty-program/skeletons/OverviewPageSkeleton';

export default function OverviewPage() {
  const { activeDesign, loading, isProPlan } = useLoyaltyProgram();

  if (loading) {
    return <OverviewPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Your loyalty program at a glance
        </p>
      </div>

      {/* Active card + stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active card widget */}
        <div className="lg:col-span-1">
          <ActiveCardWidget design={activeDesign} isProPlan={isProPlan} />
        </div>

        {/* Stats grid */}
        <div className="lg:col-span-2">
          <QuickStatsGrid
            totalCustomers={0}
            activeCustomers={0}
            redemptionsThisMonth={0}
          />
        </div>
      </div>

      {/* Status indicators */}
      <StatusIndicators isProPlan={isProPlan} />
    </div>
  );
}
