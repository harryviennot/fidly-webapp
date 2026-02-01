'use client';

import { useLoyaltyProgram } from '../layout';
import { TemplateGrid } from '@/components/loyalty-program/templates/TemplateGrid';
import { TemplatesPageSkeleton } from '@/components/loyalty-program/skeletons/TemplatesPageSkeleton';

export default function TemplatesPage() {
  const {
    activeDesign,
    inactiveDesigns,
    loading,
    isProPlan,
    handleDelete,
    handleActivate,
  } = useLoyaltyProgram();

  if (loading) {
    return <TemplatesPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Card Templates</h1>
        <p className="text-muted-foreground mt-1">
          Manage your loyalty card designs
        </p>
      </div>

      {/* Template Grid */}
      <TemplateGrid
        activeDesign={activeDesign}
        inactiveDesigns={inactiveDesigns}
        isProPlan={isProPlan}
        onDelete={handleDelete}
        onActivate={handleActivate}
      />
    </div>
  );
}
