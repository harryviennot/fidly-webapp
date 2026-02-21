'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircleIcon, CircleIcon, XIcon } from '@phosphor-icons/react';
import type { LoyaltyProgram, CardDesign } from '@/types';

interface SetupChecklistProps {
  program: LoyaltyProgram | undefined;
  activeDesign: CardDesign | undefined;
  designs: CardDesign[];
  totalCustomers: number;
}

export function SetupChecklist({ program, activeDesign, designs, totalCustomers }: SetupChecklistProps) {
  const t = useTranslations('loyaltyProgram.overview');
  const [dismissed, setDismissed] = useState(false);

  const steps = [
    { key: 'configureProgram', done: !!program?.name && !!program?.config?.total_stamps },
    { key: 'createDesign', done: designs.length > 0 },
    { key: 'activateCard', done: !!activeDesign },
    { key: 'customizeNotifications', done: false },
    { key: 'firstCustomer', done: totalCustomers > 0 },
  ];

  const labels: Record<string, string> = {
    configureProgram: t('checkConfigureProgram'),
    createDesign: t('checkCreateDesign'),
    activateCard: t('checkActivateCard'),
    customizeNotifications: t('checkCustomizeNotifications'),
    firstCustomer: t('checkFirstCustomer'),
  };

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('setupChecklist')}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground"
            onClick={() => setDismissed(true)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {steps.map((step) => (
            <li key={step.key} className="flex items-center gap-3 text-sm">
              {step.done ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" weight="fill" />
              ) : (
                <CircleIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <span className={step.done ? 'text-muted-foreground line-through' : ''}>
                {labels[step.key]}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
