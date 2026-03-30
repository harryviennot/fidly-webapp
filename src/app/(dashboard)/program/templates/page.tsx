'use client';

import { useTranslations } from 'next-intl';
import { PlusIcon, Crown } from '@phosphor-icons/react';
import { LoadingSpinner } from '@/components/reusables/loading-spinner';
import { PageHeader } from '@/components/redesign';
import { TemplateGrid } from '@/components/loyalty-program/templates/TemplateGrid';
import { useDesignEntitlements } from '@/hooks/useEntitlements';
import { useProgram } from '../layout';

export default function ProgramTemplatesPage() {
  const {
    designs,
    activeDesign,
    inactiveDesigns,
    loading,
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
        actions={[
          canCreateDesign
            ? { label: t('createCard'), icon: <PlusIcon className="w-4 h-4" />, href: '/design/new' }
            : { label: 'Upgrade for More Cards', icon: <Crown className="w-4 h-4" weight="fill" />, href: '/billing', variant: 'secondary' as const },
        ]}
      />

      <TemplateGrid
        activeDesign={activeDesign}
        inactiveDesigns={inactiveDesigns}
        onDelete={handleDelete}
        onActivate={handleActivate}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
}
