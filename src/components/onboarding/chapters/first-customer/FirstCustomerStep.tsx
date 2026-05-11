'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { BusinessUrlCard } from '@/components/program/BusinessUrlCard';
import { useWizardStep } from '../../wizard-context';

/**
 * Chapter 7 — optional. v1 reuses the dashboard's `BusinessUrlCard` (signup
 * URL + QR) so users can install their own card from their phone. The full
 * "owner-as-customer + watch push install" demo is planned for v2.
 */
export function FirstCustomerStep() {
  const t = useTranslations('onboardingBusiness.chapters.firstCustomer');
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
      <BusinessUrlCard delay={0} />
    </div>
  );
}
