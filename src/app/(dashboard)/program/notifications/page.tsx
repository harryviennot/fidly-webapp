'use client';

import { useTranslations } from 'next-intl';
import { BellIcon } from '@phosphor-icons/react';

export default function ProgramNotificationsPage() {
  const t = useTranslations('loyaltyProgram.overview');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('notifications')}</h2>
        <p className="text-muted-foreground">{t('notificationsDescription')}</p>
      </div>

      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <BellIcon className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t('comingSoon')}</p>
      </div>
    </div>
  );
}
