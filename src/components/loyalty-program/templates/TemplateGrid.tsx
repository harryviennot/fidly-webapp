'use client';

import Link from 'next/link';
import { CardDesign } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@phosphor-icons/react';
import { TemplateCard } from './TemplateCard';

interface TemplateGridProps {
  activeDesign: CardDesign | undefined;
  inactiveDesigns: CardDesign[];
  isProPlan: boolean;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function TemplateGrid({
  activeDesign,
  inactiveDesigns,
  isProPlan,
  onDelete,
  onActivate,
  onDuplicate,
}: TemplateGridProps) {
  const canCreateNew = isProPlan || (!activeDesign && inactiveDesigns.length === 0);

  // Combine all cards with active first
  const allDesigns = activeDesign
    ? [activeDesign, ...inactiveDesigns]
    : inactiveDesigns;

  return (
    <div className="space-y-6">
      {/* Card grid */}
      {allDesigns.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allDesigns.map((design) => (
            <TemplateCard
              key={design.id}
              design={design}
              onDelete={onDelete}
              onActivate={onActivate}
              onDuplicate={onDuplicate}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-xl">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <PlusIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first loyalty card design
          </p>
          {canCreateNew && (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/loyalty-program/design/new">
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Card
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Pro hint for non-pro users with existing card */}
      {!isProPlan && activeDesign && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--cream)] p-4">
          <p className="text-sm">
            <span className="font-medium">Want more card designs?</span>
            <span className="text-muted-foreground ml-1">Upgrade to create unlimited templates.</span>
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-full shrink-0 ml-4">
            <Link href="/settings/billing">
              Upgrade to Pro
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
