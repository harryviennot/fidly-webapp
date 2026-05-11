'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useDesigns, designKeys } from '@/hooks/use-designs';
import { updateDesign } from '@/api';
import { DesignFormProvider } from '@/components/design/forms/DesignFormContext';
import { ContentForm } from '@/components/design/forms/ContentForm';
import { useWizardStep } from '../../wizard-context';
import { useDesignStepState } from './useDesignStepState';

/**
 * Chapter 5 step 3 — optional. Edits the front-of-card secondary + auxiliary
 * fields on the design row.
 */
export function ContentStep() {
  const t = useTranslations('onboardingBusiness.chapters.design.steps.content');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();
  const { data: designs = [] } = useDesigns(businessId);
  const existingDesign = designs[0];
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

        await updateDesign(businessId, existingDesign.id, data);
        queryClient.invalidateQueries({ queryKey: designKeys.all(businessId) });
        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [businessId, formData, existingDesign?.id, queryClient, ctx, tErr]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
      </header>
      <DesignFormProvider value={designContext}>
        <ContentForm />
      </DesignFormProvider>
    </div>
  );
}
