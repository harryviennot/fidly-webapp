'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useBusiness } from '@/contexts/business-context';
import { useNotificationTemplates } from '@/hooks/use-notifications';
import { TriggerCard } from '@/components/notifications/TriggerCard';
import { TriggerEditSheet } from '@/components/notifications/TriggerEditSheet';
import { useWizardStep } from '../../wizard-context';
import type { NotificationTemplate, TriggerType } from '@/types/notification';

/**
 * Chapter 6 step 2 — optional. Lists the transactional notification templates
 * (everything except per-milestone customs) and lets the user customise each
 * by opening the same `TriggerEditSheet` used on the dashboard. Per-template
 * saves happen inside the Sheet; the wizard's "Save & continue" just advances.
 */
export function TransactionalStep() {
  const t = useTranslations('onboardingBusiness.chapters.notifications.steps.transactional');
  const { currentBusiness } = useBusiness();
  const { data } = useNotificationTemplates(currentBusiness?.id);
  const ctx = useWizardStep();

  const templates = useMemo(() => data?.items ?? [], [data]);
  const transactional = useMemo(
    () => templates.filter((tpl) => tpl.trigger !== 'milestone'),
    [templates]
  );

  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const openTemplate = (trigger: TriggerType) => {
    const tpl = transactional.find((t) => t.trigger === trigger);
    if (tpl) setEditing(tpl);
  };

  useEffect(() => {
    ctx.setCanSkip(true);
  }, [ctx]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="flex flex-col gap-2">
        {transactional.map((tpl) => (
          <TriggerCard
            key={tpl.trigger}
            template={tpl}
            readOnly={false}
            onEdit={openTemplate}
          />
        ))}
      </div>

      <TriggerEditSheet
        template={editing}
        onClose={() => setEditing(null)}
        defaultBody={editing?.default_body ?? { en: '', fr: '' }}
        programName={null}
        rewardNameSet={undefined}
      />
    </div>
  );
}
