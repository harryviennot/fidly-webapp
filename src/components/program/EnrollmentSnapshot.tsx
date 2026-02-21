'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis } from 'recharts';
import { UsersIcon } from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { getCustomers } from '@/api';
import { customerKeys } from '@/hooks/use-customers';

interface EnrollmentSnapshotProps {
  totalStamps: number;
}

const chartConfig = {
  customers: { label: 'Customers', color: 'var(--accent)' },
};

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

  const histogram = useMemo(() => {
    if (!data?.data.length) return [];
    return Array.from({ length: totalStamps + 1 }, (_, stamp) => ({
      stamp: String(stamp),
      customers: data.data.filter((c) => (c.stamps ?? 0) === stamp).length,
    }));
  }, [data, totalStamps]);

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

        {/* Stamp distribution bar chart */}
        {!isLoading && totalCustomers > 0 && histogram.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('stampDistribution')}
            </p>
            <ChartContainer config={chartConfig} className="h-[120px] w-full">
              <BarChart data={histogram}>
                <XAxis dataKey="stamp" tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="customers" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
