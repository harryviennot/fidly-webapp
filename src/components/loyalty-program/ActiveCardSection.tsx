'use client';

import Link from 'next/link';
import { CardDesign } from '@/types';
import { DesignCard } from '@/components/design';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusIcon } from '@phosphor-icons/react';

interface ActiveCardSectionProps {
  design: CardDesign | undefined;
  inactiveDesign?: CardDesign;
  onActivate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ActiveCardSection({ design, inactiveDesign, onActivate, onDelete }: ActiveCardSectionProps) {
  // Show inactive card if no active design but there's an inactive one (Pay plan scenario)
  if (!design && inactiveDesign) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Your Card</h3>
          <Badge variant="secondary" className="text-xs">Not Active</Badge>
        </div>
        <DesignCard
          design={inactiveDesign}
          onActivate={onActivate}
          onDelete={onDelete}
        />
        <p className="text-xs text-muted-foreground text-center">
          Use the menu to activate your card
        </p>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Active Card</h3>
        <div className="bg-muted/50 border border-dashed border-muted-foreground/25 rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            No active card design yet
          </p>
          <Button asChild size="sm">
            <Link href="/design/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Design
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Active Card</h3>
        <span className="text-xs text-green-600 font-medium">Live</span>
      </div>
      <Link href={`/design/${design.id}`} className="block group">
        <div className="transition-transform group-hover:scale-[1.02]">
          <DesignCard design={design} />
        </div>
      </Link>
      <p className="text-xs text-muted-foreground text-center">
        Click to edit design
      </p>
    </div>
  );
}
