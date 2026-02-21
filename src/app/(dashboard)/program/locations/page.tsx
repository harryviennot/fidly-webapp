'use client';

import { useTranslations } from 'next-intl';
import { MapPinIcon, Crown } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';

export default function ProgramLocationsPage() {
  const t = useTranslations('loyaltyProgram.overview');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div>
          <h2 className="text-2xl font-bold">{t('locations')}</h2>
          <p className="text-muted-foreground">{t('locationsDescription')}</p>
        </div>
        <Badge variant="secondary" className="bg-amber-100 text-amber-700 ml-auto">
          <Crown className="w-3 h-3 mr-1" weight="fill" />
          Pro
        </Badge>
      </div>

      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <MapPinIcon className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t('comingSoon')}</p>
      </div>
    </div>
  );
}
