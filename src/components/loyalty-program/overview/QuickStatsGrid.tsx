'use client';

import { UsersIcon, CreditCardIcon, TrophyIcon } from '@phosphor-icons/react';
import { StatCardSmall } from '@/components/reusables/stats/StatCardSmall';

interface QuickStatsGridProps {
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
    },
    {
      label: 'Active Customers',
      value: activeCustomers,
      icon: UsersIcon,
      description: 'With wallet passes',
    },
    {
      label: 'Redemptions',
      value: redemptionsThisMonth,
      icon: TrophyIcon,
      description: 'This month',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return <StatCardSmall
          key={stat.label}
          icon={<Icon size={20} weight="duotone" />}
          label={stat.label}
          value={stat.value}
        // subtext={stat.description}
        />
      })}
    </div>
  );
}
