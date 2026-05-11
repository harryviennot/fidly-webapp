'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useWizardStep } from '../../wizard-context';

/**
 * First chapter. Pure UI — no save handler registered. The wizard footer's
 * primary CTA simply advances to the next sub-step. Overrides the CTA label
 * to "Let's go" so the footer doesn't say "Save & continue" on an info-only
 * screen.
 */
export function WelcomeStep() {
  const t = useTranslations('onboardingBusiness.chapters.welcome');
  const ctx = useWizardStep();

  useEffect(() => {
    ctx.setNextLabel(t('cta'));
    return () => ctx.setNextLabel(null);
  }, [ctx, t]);

  return (
    <div className="flex flex-col gap-5 text-center min-[768px]:text-left">
      <div className="flex flex-col gap-2">
        <h2 className="text-[22px] min-[768px]:text-[28px] font-semibold leading-tight text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[15px] min-[768px]:text-[16px] text-[#7A7A7A]">{t('subtitle')}</p>
      </div>
      <p className="text-[14px] leading-relaxed text-[var(--foreground)]/80">{t('body')}</p>
    </div>
  );
}
