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

      {/* Main content - Stats + status indicators on top, card below */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats grid + Status indicators - appears first on mobile, right side on desktop */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
          <QuickStatsGrid
            totalCustomers={0}
            activeCustomers={0}
            redemptionsThisMonth={0}
          />
          <StatusIndicators isProPlan={isProPlan} />
        </div>

        {/* Active card widget - appears second on mobile, left side on desktop */}
        <div className="lg:col-span-1 order-2 lg:order-1 max-w-xs lg:max-w-none">
          <ActiveCardWidget design={activeDesign} isProPlan={isProPlan} />
        </div>
      </div>
    </div>
  );
}
