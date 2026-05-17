'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useDesigns, designKeys } from '@/hooks/use-designs';
import { useDefaultProgram } from '@/hooks/use-programs';
import { updateDesign } from '@/api';
import type { CardDesign } from '@/types';
import { DesignFormProvider } from '@/components/design/forms/DesignFormContext';
import { ContentForm } from '@/components/design/forms/ContentForm';
import { useWizardStep } from '../../wizard-context';
import { useDesignStepState } from './useDesignStepState';
import { DesignPreviewPane } from './DesignPreviewPane';
import { pruneEmptyLabelFields } from './pruneDesignFields';

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
  const { data: program } = useDefaultProgram(businessId);
  const ctx = useWizardStep();

  const { formData, designContext } = useDesignStepState(existingDesign, 'content');

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

        // ContentStep edits secondary / auxiliary fields — these aren't in
        // the backend's `strip_affecting_fields` set, so the default
        // regenerate_strips=true behaviour is a no-op on the strip
        // pipeline. Letting it default keeps the code simple and avoids
        // having to track stripDirty state across steps.
        const updated = await updateDesign(businessId, existingDesign.id, data);
        queryClient.setQueryData<CardDesign[]>(designKeys.all(businessId), (prev) => {
          if (!prev) return [updated];
          return prev.map((d) => (d.id === existingDesign.id ? updated : d));
        });
        queryClient.invalidateQueries({ queryKey: designKeys.all(businessId) });
        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [businessId, formData, existingDesign?.id, queryClient, ctx, tErr]);

  if (program === undefined) {
    return null;
  }

  return (
    <DesignFormProvider value={designContext}>
      <div className="flex flex-col min-[1024px]:flex-row gap-6 min-[1024px]:gap-8">
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <header className="flex flex-col gap-1 animate-slide-up">
            <h2 className="wiz-h font-semibold text-[var(--foreground)]">
              {t('title')}
            </h2>
            <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
            <p className="wiz-micro text-[#999] mt-3">{t('technicalNote')}</p>
          </header>
          <div className="animate-slide-up delay-80">
            <ContentForm />
          </div>
        </div>
        <DesignPreviewPane />
      </div>
    </DesignFormProvider>
  );
}
