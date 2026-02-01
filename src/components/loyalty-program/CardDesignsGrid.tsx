'use client';

import Link from 'next/link';
import { CardDesign } from '@/types';
import { DesignCard } from '@/components/design';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, Crown } from '@phosphor-icons/react';

interface CardDesignsGridProps {
  designs: CardDesign[];
  activeDesign: CardDesign | undefined;
  isProPlan: boolean;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onRefresh: () => void;
}

export function CardDesignsGrid({
  designs,
  activeDesign,
  isProPlan,
  onDelete,
  onActivate,
}: CardDesignsGridProps) {
  const hasActiveDesign = !!activeDesign;
  const totalDesigns = designs.length + (hasActiveDesign ? 1 : 0);

  // Pay plan: single card shown in ActiveCardSection, only show mobile-only grid for access
  const payPlanSingleCard = !isProPlan && totalDesigns === 1;

  if (payPlanSingleCard) {
    // The single card (active or inactive) is shown in ActiveCardSection on desktop
    // On mobile, show it here since ActiveCardSection is hidden
    const cardToShow = activeDesign || designs[0];
    if (!cardToShow) return null;

    return (
      <div className="lg:hidden space-y-4 pt-6 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Card</h2>
        </div>
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
        >
          <DesignCard
            design={cardToShow}
            onDelete={onDelete}
            onActivate={onActivate}
          />
        </div>
      </div>
    );
  }

  // Pay plan with no cards - don't show grid, ActiveCardSection has create button
  if (!isProPlan && totalDesigns === 0) {
    return null;
  }

  // This section is only shown for Pro plan users (Pay plan handled above)
  return (
    <div className="space-y-4 pt-6 border-t border-[var(--border)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Card Designs</h2>
          <Badge variant="default" className="text-xs">
            <Crown className="w-3 h-3 mr-1" />
            Pro
          </Badge>
        </div>
        <Button asChild size="sm">
          <Link href="/loyalty-program/design/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            New Design
          </Link>
        </Button>
      </div>

      {designs.length === 0 && !activeDesign ? (
        <div className="bg-muted/50 border border-dashed border-muted-foreground/25 rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Create additional designs for seasonal campaigns or special promotions
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/loyalty-program/design/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Design
            </Link>
          </Button>
        </div>
      ) : (
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
        >
          {/* Active design shown on mobile only (hidden on lg+) */}
          {activeDesign && (
            <div className="lg:hidden">
              <DesignCard
                design={activeDesign}
                onDelete={onDelete}
                onActivate={onActivate}
              />
            </div>
          )}
          {designs.map((design) => (
            <DesignCard
              key={design.id}
              design={design}
              onDelete={onDelete}
              onActivate={onActivate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
