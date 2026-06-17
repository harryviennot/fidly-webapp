'use client';

import { useTranslations } from 'next-intl';
import { PlusIcon, Crown } from '@phosphor-icons/react';
import { PageHeader } from '@/components/redesign';
import { ActiveCardHero } from '@/components/loyalty-program/templates/ActiveCardHero';
import { TemplateGrid } from '@/components/loyalty-program/templates/TemplateGrid';
import { TemplatesSkeleton } from '@/components/loyalty-program/templates/TemplatesSkeleton';
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
  const tFeatures = useTranslations('features');
  const { canCreateDesign } = useDesignEntitlements(designs.length);

  if (loading) {
    return <TemplatesSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tProgram('cardTemplates')}
        subtitle={t('templatesSubtitle')}
        actions={[
          canCreateDesign
            ? { label: t('newStyle'), icon: <PlusIcon className="w-4 h-4" />, href: '/design/new' }
            : { label: tFeatures('upgrade.moreCards'), icon: <Crown className="w-4 h-4" weight="fill" />, href: '/billing', variant: 'secondary' as const },
        ]}
      />

      {activeDesign && (
        <ActiveCardHero design={activeDesign} onDuplicate={handleDuplicate} />
      )}

      {activeDesign ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t('otherStyles')}
          </h2>
          <TemplateGrid
            designs={inactiveDesigns}
            totalDesignCount={designs.length}
            hasActiveDesign
            onDelete={handleDelete}
            onActivate={handleActivate}
            onDuplicate={handleDuplicate}
          />
        </section>
      ) : (
        <TemplateGrid
          designs={inactiveDesigns}
          totalDesignCount={designs.length}
          hasActiveDesign={false}
          onDelete={handleDelete}
          onActivate={handleActivate}
          onDuplicate={handleDuplicate}
        />
      )}
    </div>
  );
}
