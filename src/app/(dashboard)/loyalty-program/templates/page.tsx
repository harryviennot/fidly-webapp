'use client';

import Link from 'next/link';
import { useLoyaltyProgram } from '../layout';
import { TemplateGrid } from '@/components/loyalty-program/templates/TemplateGrid';
import { TemplatesPageSkeleton } from '@/components/loyalty-program/skeletons/TemplatesPageSkeleton';
import { Button } from '@/components/ui/button';
import { PlusIcon, Crown } from '@phosphor-icons/react';

export default function TemplatesPage() {
  const {
    activeDesign,
    inactiveDesigns,
    loading,
    isProPlan,
    handleDelete,
    handleActivate,
    handleDuplicate,
  } = useLoyaltyProgram();

  if (loading) {
    return <TemplatesPageSkeleton />;
  }

  const canCreateNew = isProPlan || (!activeDesign && inactiveDesigns.length === 0);

  return (
    <div className="space-y-6">
      {/* Page header with button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Card Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage your loyalty card designs
          </p>
        </div>
        {canCreateNew ? (
          <Button asChild className="rounded-full">
            <Link href="/loyalty-program/design/new">
              <PlusIcon className="w-4 h-4 mr-2" />
              New Card
            </Link>
          </Button>
        ) : (
          <Button className="rounded-full" disabled>
            <Crown className="w-4 h-4 mr-2 text-amber-500" weight="fill" />
            Upgrade for More Cards
          </Button>
        )}
      </div>

      {/* Template Grid */}
      <TemplateGrid
        activeDesign={activeDesign}
        inactiveDesigns={inactiveDesigns}
        isProPlan={isProPlan}
        onDelete={handleDelete}
        onActivate={handleActivate}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
}
