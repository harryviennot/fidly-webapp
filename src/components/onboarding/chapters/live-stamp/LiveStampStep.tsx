'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LightningIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import { useWizardStep } from '../../wizard-context';

/**
 * Chapter 8 — optional. v1 stub: points users to /customers where the dashboard
 * exposes the existing "scan to stamp" flow. The full magic moment (auto-
 * registered owner customer + one-tap test stamp + live push detection) is
 * planned for the next iteration.
 */
export function LiveStampStep() {
  const t = useTranslations('onboardingBusiness.chapters.liveStamp');
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

      <div className="rounded-[12px] border border-[var(--border)] bg-white p-5 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
            <LightningIcon className="w-5 h-5 text-[var(--accent)]" weight="bold" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[var(--foreground)]">{t('cardTitle')}</p>
            <p className="text-[12.5px] text-[#7A7A7A] leading-relaxed mt-0.5">{t('cardBody')}</p>
          </div>
        </div>
        <Link
          href="/customers"
          className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors no-underline self-start min-h-[44px]"
        >
          {t('openCustomers')}
          <ArrowSquareOutIcon className="w-3.5 h-3.5" weight="bold" />
        </Link>
      </div>
    </div>
  );
}
