'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PlusIcon, Crown } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { TemplateGrid } from '@/components/loyalty-program/templates/TemplateGrid';
import { useDesignEntitlements } from '@/hooks/useEntitlements';
import { useProgram } from '../layout';

export default function ProgramTemplatesPage() {
  const {
    designs,
    activeDesign,
    inactiveDesigns,
    loading,
    isProPlan,
    handleDelete,
    handleActivate,
    handleDuplicate,
  } = useProgram();

  const t = useTranslations('designEditor');
  const tProgram = useTranslations('loyaltyProgram');
  const { canCreateDesign } = useDesignEntitlements(designs.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{tProgram('cardTemplates')}</h2>
        {canCreateDesign ? (
          <Button asChild className="rounded-full">
            <Link href="/design/new">
              <PlusIcon className="w-4 h-4 mr-2" />
              {t('createCard')}
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
