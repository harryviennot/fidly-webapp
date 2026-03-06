'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PlusIcon, Crown } from '@phosphor-icons/react';
import { LoadingSpinner } from '@/components/reusables/loading-spinner';
import { PageHeader } from '@/components/redesign';
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
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tProgram('cardTemplates')}
        action={
          canCreateDesign ? (
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
          )
        }
      />

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
