'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from '@phosphor-icons/react';
import { IconUploadCard } from '@/components/notifications/IconUploadCard';
import { useBusiness } from '@/contexts/business-context';
import { useUploadBusinessIcon } from '@/hooks/use-notifications';
import { cropUrlToAspect } from '@/lib/image-crop';
import { useWizardStep } from '../../wizard-context';

/**
 * Notification icon step — optional. The IconUploadCard handles its own
 * mutation (uploads happen instantly on file pick) so the wizard's "Continue"
 * just advances.
 *
 * v3 addition: when the owner lands on this step for the first time and
 * `business.icon_url` is null but `business.logo_url` is set, we pre-fill the
 * icon by center-cropping the business logo to a 1:1 square and uploading it
 * non-interactively. The owner can replace it any time via the upload card.
 */
export function IconStep() {
  const t = useTranslations('onboardingBusiness.chapters.notifications.steps.icon');
  const ctx = useWizardStep();
  const { currentBusiness, refetch } = useBusiness();
  const uploadIcon = useUploadBusinessIcon(currentBusiness?.id);

  const [prefillDismissed, setPrefillDismissed] = useState(false);
  const [didPrefill, setDidPrefill] = useState(false);
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    ctx.setCanSkip(true);
  }, [ctx]);

  // One-shot prefill effect — runs once per `business.id` if the conditions
  // match. We track the business id to avoid retrying after a deletion.
  useEffect(() => {
    if (!currentBusiness) return;
    if (currentBusiness.icon_url) return;
    if (!currentBusiness.logo_url) return;
    if (attemptedRef.current === currentBusiness.id) return;
    attemptedRef.current = currentBusiness.id;

    let cancelled = false;
    (async () => {
      try {
        const file = await cropUrlToAspect(currentBusiness.logo_url!, {
          aspect: 1,
          outputWidth: 144,
          outputHeight: 144,
          filename: 'icon-from-logo.png',
        });
        if (cancelled) return;
        await uploadIcon.mutateAsync(file);
        if (cancelled) return;
        await refetch();
        if (!cancelled) setDidPrefill(true);
      } catch {
        // Silently skip — owner can upload their own.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id, currentBusiness?.icon_url, currentBusiness?.logo_url]);

  const showHint = didPrefill && !prefillDismissed;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {showHint && (
        <div className="flex items-start gap-3 rounded-[10px] border border-[var(--accent)]/30 bg-[var(--accent-light)] px-3.5 py-2.5">
          <p className="flex-1 wiz-helper leading-relaxed text-[var(--foreground)]">
            {t('autoFilledHint')}
          </p>
          <button
            type="button"
            onClick={() => setPrefillDismissed(true)}
            className="shrink-0 -mr-1 p-1 text-[#666] hover:text-[#1a1a1a] transition-colors"
            aria-label={t('dismissHint')}
          >
            <X className="w-3.5 h-3.5" weight="bold" />
          </button>
        </div>
      )}

      <IconUploadCard />
    </div>
  );
}
