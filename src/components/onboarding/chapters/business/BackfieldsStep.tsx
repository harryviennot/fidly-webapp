'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { BusinessInfoEditor } from '@/components/settings/BusinessInfoEditor';
import { useWizardStep } from '../../wizard-context';
import type { BusinessInfoEntry } from '@/types/business';

/**
 * Chapter 2 sub-step — optional. Sets up the business-level back-of-card
 * info (phone, website, address, hours) once. These entries are inherited
 * by every card design; the wizard's Design → Back sub-step (Ch 5 step 4)
 * later toggles per-card visibility.
 *
 * Reuses the dashboard's `BusinessInfoEditor` so the experience matches
 * `/settings` — owners build muscle memory before they ever hit the
 * dashboard.
 */
export function BackfieldsStep() {
  const t = useTranslations('onboardingBusiness.chapters.business.steps.backfields');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const { mutateAsync: updateBusiness } = useUpdateBusiness(currentBusiness?.id);
  const ctx = useWizardStep();

  // Stored edits override the server snapshot; null = "show server value."
  // Same pattern as ProgramStep to avoid setState-in-effect when the business
  // settings reload async.
  const [edits, setEdits] = useState<BusinessInfoEntry[] | null>(null);

  const value: BusinessInfoEntry[] = useMemo(
    () => edits ?? (currentBusiness?.settings?.business_info ?? []),
    [edits, currentBusiness]
  );

  useEffect(() => {
    ctx.setCanSkip(true);
    ctx.setSubmitHandler(async () => {
      if (!currentBusiness) return { ok: false };
      if (edits === null) return { ok: true }; // untouched — nothing to save
      try {
        await updateBusiness({
          settings: { ...(currentBusiness.settings ?? {}), business_info: edits },
        });
        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [edits, currentBusiness, updateBusiness, ctx, tErr]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>
      <BusinessInfoEditor value={value} onChange={setEdits} />
    </div>
  );
}
