'use client';

import { UsersIcon, CreditCardIcon, TrophyIcon } from '@phosphor-icons/react';

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
        return (
          <div
            key={stat.label}
            className="flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-[var(--border)] bg-[var(--cream)]"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)]">
              <Icon size={20} weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-[var(--foreground)]">{stat.value}</p>
              <p className="text-sm text-[var(--muted-foreground)] truncate">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
