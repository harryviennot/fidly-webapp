'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BellIcon,
  CalendarIcon,
  MapPinIcon,
  CaretRightIcon,
  Crown,
} from '@phosphor-icons/react';

interface StatusIndicatorsProps {
  isProPlan: boolean;
  hasCustomNotifications?: boolean;
  scheduledChange?: string | null;
  geofencingLocations?: number;
}

export function StatusIndicators({
  isProPlan,
  hasCustomNotifications = false,
  scheduledChange = null,
  geofencingLocations = 0,
}: StatusIndicatorsProps) {
  const indicators = [
    {
      label: 'Notifications',
      href: '/loyalty-program/notifications',
      icon: BellIcon,
      status: hasCustomNotifications ? 'Custom' : 'Standard',
      statusColor: hasCustomNotifications ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground',
      proOnly: false,
    },
    {
      label: 'Scheduling',
      href: '/loyalty-program/scheduling',
      icon: CalendarIcon,
      status: scheduledChange || 'No changes',
      statusColor: scheduledChange ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground',
      proOnly: true,
    },
    {
      label: 'Geofencing',
      href: '/loyalty-program/geofencing',
      icon: MapPinIcon,
      status: geofencingLocations > 0 ? `On (${geofencingLocations} locations)` : 'Off',
      statusColor: geofencingLocations > 0 ? 'bg-purple-100 text-purple-700' : 'bg-muted text-muted-foreground',
      proOnly: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Program Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {indicators.map((indicator) => {
            const Icon = indicator.icon;
            const isLocked = indicator.proOnly && !isProPlan;

            return (
              <Link
                key={indicator.label}
                href={indicator.href}
                className="group p-4 rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{indicator.label}</span>
                  </div>
                  {isLocked ? (
                    <Crown className="w-4 h-4 text-amber-500" weight="fill" />
                  ) : (
                    <CaretRightIcon className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className={`${indicator.statusColor} text-xs`}
                >
                  {indicator.status}
                </Badge>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
