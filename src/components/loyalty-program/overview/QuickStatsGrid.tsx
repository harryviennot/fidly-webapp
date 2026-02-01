'use client';

import { Card, CardContent } from '@/components/ui/card';
import { UsersIcon, CreditCardIcon, TrophyIcon } from '@phosphor-icons/react';

interface QuickStatsGridProps {
  // These would come from an API in the future
  totalCustomers?: number;
  activeCustomers?: number;
  redemptionsThisMonth?: number;
}

export function QuickStatsGrid({
  totalCustomers = 0,
  activeCustomers = 0,
  redemptionsThisMonth = 0
}: QuickStatsGridProps) {
  const stats = [
    {
      label: 'Cards Issued',
      value: totalCustomers,
      icon: CreditCardIcon,
      description: 'Total loyalty cards',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Active Customers',
      value: activeCustomers,
      icon: UsersIcon,
      description: 'With wallet passes',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Redemptions',
      value: redemptionsThisMonth,
      icon: TrophyIcon,
      description: 'This month',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} hover={false}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} weight="fill" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
