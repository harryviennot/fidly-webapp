'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard } from '@phosphor-icons/react';
import { useWizardStep } from '../../wizard-context';

/**
 * Card-back intro — no form, just an explainer of what "card back" means and
 * why it's filled once per business (not per design). Footer label switches
 * to `gotIt` so the CTA reads "Got it, let's go".
 */
export function IntroStep() {
  const t = useTranslations('onboardingBusiness.chapters.card-back.steps.intro');
  const tFooter = useTranslations('onboardingBusiness.footer');
  const ctx = useWizardStep();

  useEffect(() => {
    ctx.setCanSkip(false);
    ctx.setNextLabel(tFooter('gotIt'));
    ctx.setSubmitHandler(async () => ({ ok: true }));
    return () => {
      ctx.setNextLabel(null);
      ctx.setSubmitHandler(null);
    };
  }, [ctx, tFooter]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="flex flex-col items-center gap-4 py-4">
        <div
          className="flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--accent-light)]"
          aria-hidden="true"
        >
          <CreditCard className="w-10 h-10 text-[var(--accent)]" weight="duotone" />
        </div>
      </div>

      <p className="text-[14px] leading-relaxed text-[#444]">{t('body')}</p>
    </div>
  );
}
