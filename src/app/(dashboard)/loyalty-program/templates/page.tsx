'use client';

import Link from 'next/link';
import { useLoyaltyProgram } from '../layout';
import { TemplateGrid } from '@/components/loyalty-program/templates/TemplateGrid';
import { TemplatesPageSkeleton } from '@/components/loyalty-program/skeletons/TemplatesPageSkeleton';
import { Button } from '@/components/ui/button';
import { PlusIcon, Crown } from '@phosphor-icons/react';
import { useDesignEntitlements } from '@/hooks/useEntitlements';
import { LimitBadge } from '@/components/loyalty-program/ProFeatureGate';

export default function TemplatesPage() {
  const {
    designs,
    activeDesign,
    inactiveDesigns,
    loading,
    isProPlan,
    handleDelete,
    handleActivate,
    handleDuplicate,
  } = useLoyaltyProgram();

  const { canCreateDesign, limits } = useDesignEntitlements(designs.length);

  if (loading) {
    return <TemplatesPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header with button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Card Templates</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            Manage your loyalty card designs
            {!isProPlan && limits.max_card_designs !== null && (
              <LimitBadge current={designs.length} limit={limits.max_card_designs} />
            )}
          </p>
        </div>
        {canCreateDesign ? (
          <Button asChild className="rounded-full">
            <Link href="/loyalty-program/design/new">
              <PlusIcon className="w-4 h-4 mr-2" />
              New Card
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="rounded-full border-amber-300 text-amber-700 hover:bg-amber-50">
            <Link href="/settings/billing">
              <Crown className="w-4 h-4 mr-2" weight="fill" />
              Upgrade for More Cards
            </Link>
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
