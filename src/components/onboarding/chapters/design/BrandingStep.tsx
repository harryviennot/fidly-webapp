'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { useDesigns, designKeys } from '@/hooks/use-designs';
import { createDesign, updateDesign, uploadLogo, activateDesign } from '@/api';
import { DesignFormProvider } from '@/components/design/forms/DesignFormContext';
import { BrandingForm } from '@/components/design/forms/BrandingForm';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';
import { useDesignStepState } from './useDesignStepState';
import type { CardDesignCreate } from '@/types';

/**
 * Chapter 5 step 1 — required. Creates the business's card design (if it
 * doesn't exist yet) and activates it. The remaining design sub-steps update
 * the same design row — saving here once unblocks the entire chapter.
 */
export function BrandingStep() {
  const t = useTranslations('onboardingBusiness.chapters.design.steps.branding');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();
  const { data: designs = [] } = useDesigns(businessId);
  const existingDesign = designs[0];
  const { mutateAsync: updateBusiness } = useUpdateBusiness(businessId);
  const { updatePayload } = useWizardProgress();
  const ctx = useWizardStep();

  const { formData, pendingLogoFile, setPendingLogoFile, designContext } =
    useDesignStepState(existingDesign);

  useEffect(() => {
    ctx.setCanSkip(false);
    ctx.setSubmitHandler(async () => {
      if (!businessId) return { ok: false };
      try {
        const { translations, ...rest } = formData;
        void translations;
        const cleaned: CardDesignCreate = {
          ...rest,
          name: rest.name?.trim() || `${currentBusiness?.name ?? 'My'} card`,
          organization_name: rest.organization_name?.trim() || currentBusiness?.name || '',
          description: rest.description?.trim() || currentBusiness?.name || 'Loyalty card',
        };
        if (cleaned.logo_url?.startsWith('blob:')) delete cleaned.logo_url;

        let designId: string;
        if (existingDesign?.id) {
          designId = existingDesign.id;
          await updateDesign(businessId, designId, cleaned);
        } else {
          const created = await createDesign(businessId, cleaned);
          designId = created.id;
        }

        if (pendingLogoFile) {
          const result = await uploadLogo(businessId, designId, pendingLogoFile);
          await updateDesign(businessId, designId, { ...cleaned, logo_url: result.url });
          setPendingLogoFile(null);
        }

        // Activate so a usable card exists even if user skips remaining design sub-steps.
        await activateDesign(businessId, designId);

        if (currentBusiness) {
          await updateBusiness({
            settings: {
              ...(currentBusiness.settings ?? {}),
              design_reviewed: true,
            },
          });
        }
        await updatePayload({ design_id: designId });
        queryClient.invalidateQueries({ queryKey: designKeys.all(businessId) });

        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [
    businessId,
    formData,
    pendingLogoFile,
    existingDesign?.id,
    currentBusiness,
    updateBusiness,
    updatePayload,
    queryClient,
    setPendingLogoFile,
    ctx,
    tErr,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>
      <DesignFormProvider value={designContext}>
        <BrandingForm />
      </DesignFormProvider>
    </div>
  );
}
