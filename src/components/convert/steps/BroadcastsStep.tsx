'use client';

import { useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarBlankIcon, PauseCircleIcon } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { InfoBox } from '@/components/reusables/info-box';
import { useWizardStep } from '@/components/onboarding/wizard-context';
import type { ConversionPreview } from '@/types';

/**
 * Conditional step — only in the flow when the preview reported scheduled
 * broadcasts whose targeting reads the old program's values (value_min/max,
 * reward filters). The conversion moves them back to drafts; this step just
 * makes that visible before it happens.
 */
export function BroadcastsStep() {
  const t = useTranslations('conversion.steps.broadcasts');
  const locale = useLocale();
  const ctx = useWizardStep();

  const preview = ctx.getDraft<ConversionPreview>('customers.preview');
  const broadcasts = preview?.affected_broadcasts ?? [];

  useEffect(() => {
    ctx.setCanProceed(true);
  }, [ctx]);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }),
    [locale]
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[22px] font-semibold text-[var(--foreground)]">{t('title')}</h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="flex flex-col gap-2">
        {broadcasts.map((broadcast) => (
          <Card key={broadcast.id} hover={false} flat>
            <CardContent className="flex items-center gap-3 p-3.5">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--warning)]/10">
                <PauseCircleIcon className="h-5 w-5 text-[var(--warning)]" weight="fill" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-[var(--foreground)]">
                  {broadcast.title || t('untitled')}
                </p>
                {broadcast.scheduled_at && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#8A8A8A]">
                    <CalendarBlankIcon className="h-3.5 w-3.5" />
                    {t('scheduledFor', {
                      date: dateFormatter.format(new Date(broadcast.scheduled_at)),
                    })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <InfoBox variant="info" message={t('explain')} />
    </div>
  );
}
