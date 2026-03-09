'use client';

import { useTranslations } from 'next-intl';
import { TagIcon, Crown } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/redesign';

export default function ProgramPromotionsPage() {
  const t = useTranslations('loyaltyProgram.overview');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('promotions')}
        subtitle={t('promotionsDescription')}
        action={
          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
            <Crown className="w-3 h-3 mr-1" weight="fill" />
            Pro
          </Badge>
        }
      />

      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <TagIcon className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t('comingSoon')}</p>
      </div>
    </div>
  );
}
