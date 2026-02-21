'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  StampIcon,
  TrophyIcon,
  CalendarIcon,
  StackIcon,
} from '@phosphor-icons/react';
import type { LoyaltyProgram } from '@/types';

interface ProgramSummaryCardProps {
  program: LoyaltyProgram | undefined;
}

export function ProgramSummaryCard({ program }: ProgramSummaryCardProps) {
  const t = useTranslations('loyaltyProgram.overview');
  const tProgram = useTranslations('loyaltyProgram');

  if (!program) return null;

  const items = [
    {
      icon: StackIcon,
      label: t('type'),
      value: tProgram('stampCard'),
      color: 'text-blue-600 bg-blue-100',
    },
    {
      icon: StampIcon,
      label: t('stamps'),
      value: String(program.config?.total_stamps ?? 10),
      color: 'text-violet-600 bg-violet-100',
    },
    {
      icon: TrophyIcon,
      label: t('reward'),
      value: program.reward_name || t('noRewardSet'),
      color: 'text-amber-600 bg-amber-100',
    },
    {
      icon: CalendarIcon,
      label: t('activeSince'),
      value: new Date(program.created_at).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      }),
      color: 'text-green-600 bg-green-100',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('programSummary')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}>
                  <Icon className="w-4.5 h-4.5" weight="duotone" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium truncate">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
