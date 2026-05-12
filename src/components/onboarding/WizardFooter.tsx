'use client';

import { useTranslations } from 'next-intl';
import { CaretLeftIcon } from '@phosphor-icons/react';

interface WizardFooterProps {
  onBack?: () => void;
  onSkip?: () => void;
  onNext: () => void;
  onSkipAll?: () => void;
  canSkip: boolean;
  canSkipAll: boolean;
  /** When false, the primary CTA renders disabled. Defaults to `true`. */
  canProceed?: boolean;
  isBusy: boolean;
  isFirst: boolean;
  isLast: boolean;
  nextLabel?: string;
}

/**
 * Sticky bottom CTA bar. Primary "Save & continue" lives in the thumb zone on
 * mobile (full-width) and right-aligns on desktop. "Skip rest of setup"
 * surfaces on a dedicated line above the footer when the required floor is met
 * — keeps the footer itself uncrowded on mobile.
 *
 * `pb-[env(safe-area-inset-bottom)]` adds bottom padding equal to the iPhone
 * home-indicator inset so the primary CTA never sits under the indicator.
 */
export function WizardFooter({
  onBack,
  onSkip,
  onNext,
  onSkipAll,
  canSkip,
  canSkipAll,
  canProceed = true,
  isBusy,
  isFirst,
  isLast,
  nextLabel,
}: WizardFooterProps) {
  const t = useTranslations('onboardingBusiness.footer');

  return (
    <footer className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
      {canSkipAll && onSkipAll ? (
        <div className="px-4 pt-2 text-center min-[768px]:text-right min-[768px]:px-6">
          <button
            type="button"
            onClick={onSkipAll}
            disabled={isBusy}
            className="wiz-helper text-[#888] hover:text-[var(--foreground)] underline underline-offset-2 disabled:opacity-50"
          >
            {t('skipAll')}
          </button>
        </div>
      ) : null}
      <div className="flex items-center gap-2 px-4 py-3 min-[768px]:px-6 min-[768px]:py-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirst || isBusy || !onBack}
          className="inline-flex items-center gap-1 rounded-[10px] px-3 py-2.5 wiz-body-sm font-medium text-[#666] hover:text-[var(--foreground)] hover:bg-[var(--paper-hover)] transition-colors disabled:opacity-40 disabled:hover:bg-transparent min-h-[44px]"
          aria-label={t('back')}
        >
          <CaretLeftIcon className="h-4 w-4" weight="bold" />
          <span className="hidden min-[480px]:inline">{t('back')}</span>
        </button>

        {canSkip && onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            disabled={isBusy}
            className="rounded-[10px] px-3 py-2.5 wiz-body-sm font-medium text-[#888] hover:text-[var(--foreground)] hover:bg-[var(--paper-hover)] transition-colors disabled:opacity-40 min-h-[44px]"
          >
            {t('skip')}
          </button>
        ) : null}

        <div className="flex-1" />

        <button
          type="button"
          onClick={onNext}
          disabled={isBusy || !canProceed}
          className="flex-1 min-[768px]:flex-initial inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-[var(--accent)] px-5 py-3 wiz-body font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]"
        >
          {isBusy ? t('saving') : (nextLabel ?? (isLast ? t('finish') : t('next')))}
        </button>
      </div>
    </footer>
  );
}
