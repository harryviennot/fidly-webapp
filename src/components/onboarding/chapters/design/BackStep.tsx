'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { useDesigns, designKeys } from '@/hooks/use-designs';
import { useDefaultProgram } from '@/hooks/use-programs';
import { updateDesign, activateDesign } from '@/api';
import type { CardDesign } from '@/types';
import { DesignFormProvider } from '@/components/design/forms/DesignFormContext';
import { BackForm } from '@/components/design/forms/BackForm';
import { useWizardStep } from '../../wizard-context';
import { useDesignStepState } from './useDesignStepState';
import { DesignPreviewPane } from './DesignPreviewPane';
import { pruneEmptyLabelFields } from './pruneDesignFields';

/**
 * Chapter 5 step 4 — optional. Edits card-back fields + business-info
 * visibility toggles. Defensively re-activates the design so the chapter
 * ends in a known-good state even if a prior step's activation was rolled
 * back (e.g. by an admin op).
 */
export function BackStep() {
  const t = useTranslations('onboardingBusiness.chapters.design.steps.back');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();
  const { data: designs = [] } = useDesigns(businessId);
  const existingDesign = designs[0];
  const { data: program } = useDefaultProgram(businessId);
  const { mutateAsync: updateBusiness } = useUpdateBusiness(businessId);
  const ctx = useWizardStep();

  const { formData, designContext } = useDesignStepState(existingDesign, 'back');

  useEffect(() => {
    ctx.setCanSkip(true);
    ctx.setSubmitHandler(async () => {
      if (!businessId || !existingDesign?.id) return { ok: true };
      try {
        const { translations, ...rest } = formData;
        void translations;
        const data = pruneEmptyLabelFields(rest);
        if (data.logo_url?.startsWith('blob:')) delete data.logo_url;
        if (data.strip_background_url?.startsWith('blob:')) delete data.strip_background_url;

        // Per-step saves during the design chapter skip strip regen; the
        // chapter-exit hook fires one explicit regen call when the user
        // leaves the chapter (BackStep + activation will also kick a regen
        // server-side if needed).
        const updated = await updateDesign(businessId, existingDesign.id, data, {
          regenerateStrips: false,
        });
        queryClient.setQueryData<CardDesign[]>(designKeys.all(businessId), (prev) => {
          if (!prev) return [updated];
          return prev.map((d) => (d.id === existingDesign.id ? updated : d));
        });
        if (!existingDesign.is_active) {
          await activateDesign(businessId, existingDesign.id);
        }
        if (currentBusiness && !currentBusiness.settings?.design_reviewed) {
          await updateBusiness({
            // Diff-only update — see DataCollectionStep for the race rationale.
            settings: { design_reviewed: true },
          });
        }
        queryClient.invalidateQueries({ queryKey: designKeys.all(businessId) });
        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [businessId, formData, existingDesign, currentBusiness, updateBusiness, queryClient, ctx, tErr]);

  if (program === undefined) {
    return null;
  }

  return (
    <DesignFormProvider value={designContext}>
      <div className="flex flex-col min-[1024px]:flex-row gap-6 min-[1024px]:gap-8">
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <header className="flex flex-col gap-1">
            <h2 className="wiz-h font-semibold text-[var(--foreground)]">
              {t('title')}
            </h2>
            <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
          </header>
          <BackForm
            hideSettingsLink
            hideTopDescription
            copy={{
              sharedSectionTitle: t('sharedSectionTitle'),
              sharedSectionHelper: t('sharedSectionHelper'),
              specificSectionTitle: t('specificSectionTitle'),
              specificSectionHelper: t('specificSectionHelper'),
              specificEmpty: t('specificEmpty'),
              addFieldCta: t('addFieldCta'),
            }}
          />
        </div>
        <DesignPreviewPane showBack />
      </div>
    </DesignFormProvider>
  );
}
