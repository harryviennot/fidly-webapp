'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LoyaltyProgram } from '@/types';

interface ProgramSummaryCardProps {
  program: LoyaltyProgram | undefined;
}

export function ProgramSummaryCard({ program }: ProgramSummaryCardProps) {
  const t = useTranslations('loyaltyProgram.overview');
  const tProgram = useTranslations('loyaltyProgram');

  if (!program) return null;

  const rows = [
    { label: t('type'), value: tProgram('stampCard') },
    { label: t('stamps'), value: String(program.config?.total_stamps ?? 10) },
    { label: t('reward'), value: program.reward_name || t('noRewardSet') },
    {
      label: t('activeSince'),
      value: new Date(program.created_at).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      }),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('programSummary')}</CardTitle>
          <Badge variant="secondary">{tProgram('stampCard')}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
