'use client';

import Link from 'next/link';
import { CardDesign } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, Crown } from '@phosphor-icons/react';
import { TemplateCard } from './TemplateCard';

interface TemplateGridProps {
  activeDesign: CardDesign | undefined;
  inactiveDesigns: CardDesign[];
  isProPlan: boolean;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
}

export function TemplateGrid({
  activeDesign,
  inactiveDesigns,
  isProPlan,
  onDelete,
  onActivate,
}: TemplateGridProps) {
  const canCreateNew = isProPlan || (!activeDesign && inactiveDesigns.length === 0);

  return (
    <div className="space-y-8">
      {/* Active Card Section */}
      {activeDesign && (
        <div className="p-6 rounded-xl border-2 border-[var(--accent)]/30 bg-[var(--accent)]/5">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Active Card
            </Badge>
            <span className="text-xs text-muted-foreground">
              This card is currently being used by your customers
            </span>
          </div>
          <div className="max-w-xs">
            <TemplateCard
              design={activeDesign}
              onDelete={onDelete}
              onActivate={onActivate}
            />
          </div>
        </div>
      )}

      {/* Other Templates Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">
            {activeDesign ? 'Other Templates' : 'Your Templates'}
          </h3>
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

        {inactiveDesigns.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {inactiveDesigns.map((design) => (
              <TemplateCard
                key={design.id}
                design={design}
                onDelete={onDelete}
                onActivate={onActivate}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-xl">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <PlusIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {activeDesign
                ? 'Create additional card templates for different campaigns or seasons'
                : 'Create your first loyalty card design'}
            </p>
            {canCreateNew && (
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/loyalty-program/design/new">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Template
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pro upsell for non-pro users with existing card */}
      {!isProPlan && activeDesign && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-amber-600 mt-0.5" weight="fill" />
            <div>
              <p className="font-medium text-amber-900">Want multiple card designs?</p>
              <p className="text-sm text-amber-700 mt-1">
                Upgrade to Pro to create unlimited card templates for seasonal campaigns, special events, or A/B testing.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3 rounded-full border-amber-300 text-amber-700 hover:bg-amber-100">
                <Link href="/settings/billing">
                  Upgrade to Pro
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
