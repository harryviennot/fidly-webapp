'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersIcon } from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { getCustomers } from '@/api';
import { customerKeys } from '@/hooks/use-customers';

interface EnrollmentSnapshotProps {
  totalStamps: number;
}

export function EnrollmentSnapshot({ totalStamps }: EnrollmentSnapshotProps) {
  const t = useTranslations('loyaltyProgram.overview');
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;

  const { data, isLoading } = useQuery({
    queryKey: [...customerKeys.all(businessId!), 'enrollment'] as const,
    queryFn: () => getCustomers(businessId!, 200, 0),
    enabled: !!businessId,
  });

  const totalCustomers = data?.total ?? 0;

  const buckets = useMemo(() => {
    if (!data?.data.length) return [];
    const third = Math.ceil(totalStamps / 3);
    let low = 0, mid = 0, high = 0;
    for (const c of data.data) {
      const stamps = c.stamps ?? 0;
      if (stamps < third) low++;
      else if (stamps < third * 2) mid++;
      else high++;
    }
    const count = data.data.length;
    return [
      { label: `${t('low')} (0-${third - 1})`, percentage: Math.round((low / count) * 100) },
      { label: `${t('mid')} (${third}-${third * 2 - 1})`, percentage: Math.round((mid / count) * 100) },
      { label: `${t('high')} (${third * 2}-${totalStamps})`, percentage: Math.round((high / count) * 100) },
    ];
  }, [data, totalStamps, t]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('enrollment')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enrolled count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--accent)]/10">
            <UsersIcon className="w-5 h-5 text-[var(--accent)]" weight="duotone" />
          </div>
          <div>
            <p className="text-2xl font-bold">{isLoading ? '—' : totalCustomers}</p>
            <p className="text-sm text-muted-foreground">{t('enrolled')}</p>
          </div>
        </div>

        {/* Stamp distribution */}
        {!isLoading && totalCustomers > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('stampDistribution')}
            </p>
            {buckets.map((bucket) => (
              <div key={bucket.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{bucket.label}</span>
                  <span className="font-medium">{bucket.percentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                    style={{ width: `${bucket.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
