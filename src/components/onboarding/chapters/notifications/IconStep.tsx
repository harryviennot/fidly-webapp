'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { IconUploadCard } from '@/components/notifications/IconUploadCard';
import { useWizardStep } from '../../wizard-context';

/**
 * Chapter 6 step 1 — optional. The IconUploadCard handles its own mutation
 * (uploads happen instantly on file pick) so the wizard's "Save & continue"
 * just advances.
 */
export function IconStep() {
  const t = useTranslations('onboardingBusiness.chapters.notifications.steps.icon');
  const ctx = useWizardStep();

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
      <IconUploadCard />
    </div>
  );
}
