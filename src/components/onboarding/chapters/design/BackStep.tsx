'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { useDesigns, designKeys } from '@/hooks/use-designs';
import { updateDesign, activateDesign } from '@/api';
import type { CardDesign } from '@/types';
import { DesignFormProvider } from '@/components/design/forms/DesignFormContext';
import { BackForm } from '@/components/design/forms/BackForm';
import { useWizardStep } from '../../wizard-context';
import { useDesignStepState } from './useDesignStepState';
import { DesignPreviewPane } from './DesignPreviewPane';

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
  const { mutateAsync: updateBusiness } = useUpdateBusiness(businessId);
  const ctx = useWizardStep();

  const { formData, designContext } = useDesignStepState(existingDesign);

  useEffect(() => {
    ctx.setCanSkip(true);
    ctx.setSubmitHandler(async () => {
      if (!businessId || !existingDesign?.id) return { ok: true };
      try {
        const { translations, ...data } = formData;
        void translations;
        if (data.logo_url?.startsWith('blob:')) delete data.logo_url;
        if (data.strip_background_url?.startsWith('blob:')) delete data.strip_background_url;

        const updated = await updateDesign(businessId, existingDesign.id, data);
        queryClient.setQueryData<CardDesign[]>(designKeys.all(businessId), (prev) => {
          if (!prev) return [updated];
          return prev.map((d) => (d.id === existingDesign.id ? updated : d));
        });
        if (!existingDesign.is_active) {
          await activateDesign(businessId, existingDesign.id);
        }
        if (currentBusiness && !currentBusiness.settings?.design_reviewed) {
          await updateBusiness({
            settings: { ...(currentBusiness.settings ?? {}), design_reviewed: true },
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
          <BackForm hideSettingsLink designOnlyExplain={t('designOnlyExplain')} />
        </div>
        <DesignPreviewPane showBack />
      </div>
    </DesignFormProvider>
  );
}
