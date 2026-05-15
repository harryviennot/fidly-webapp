'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MegaphoneIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/card';
import { useWizardStep } from '../../wizard-context';

/**
 * First-broadcast intro — no form. Three labeled paragraphs framing what a
 * broadcast is, how it differs from automatic stamp/reward messages, and
 * "your audience is one person right now" so the owner expects to receive
 * the test broadcast on their own phone.
 */
export function IntroStep() {
  const t = useTranslations('onboardingBusiness.chapters.first-broadcast.steps.intro');
  const tFooter = useTranslations('onboardingBusiness.footer');
  const ctx = useWizardStep();

  useEffect(() => {
    ctx.setCanSkip(true);
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
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      <div className="flex flex-col items-center gap-4 py-2">
        <div
          className="flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--accent-light)]"
          aria-hidden="true"
        >
          <MegaphoneIcon className="w-10 h-10 text-[var(--accent)]" weight="duotone" />
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="wiz-body font-semibold text-[var(--foreground)]">
          {t('whatItIsTitle')}
        </h3>
        <p className="wiz-body leading-relaxed text-[#444]">{t('whatItIsBody')}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="wiz-body font-semibold text-[var(--foreground)]">
          {t('differentFromTitle')}
        </h3>
        <p className="wiz-body leading-relaxed text-[#444]">{t('differentFromBody')}</p>
      </section>

      <Card hover={false} className="flex flex-col gap-2 bg-[var(--paper)] p-4 shadow-none">
        <h3 className="wiz-body font-semibold text-[var(--foreground)]">
          {t('audienceOfOneTitle')}
        </h3>
        <p className="wiz-body leading-relaxed text-[#444]">{t('audienceOfOneBody')}</p>
      </Card>
    </div>
  );
}
