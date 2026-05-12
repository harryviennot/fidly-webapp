'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useDesigns, designKeys } from '@/hooks/use-designs';
import { updateDesign, uploadStripBackground } from '@/api';
import { DesignFormProvider } from '@/components/design/forms/DesignFormContext';
import { StampsForm } from '@/components/design/forms/StampsForm';
import { useWizardStep } from '../../wizard-context';
import { useDesignStepState } from './useDesignStepState';
import { DesignPreviewPane } from './DesignPreviewPane';

/**
 * Chapter 5 step 2 — optional. Edits stamp / reward icons + colors + the
 * optional strip background on the design row that BrandingStep created.
 */
export function StampsStep() {
  const t = useTranslations('onboardingBusiness.chapters.design.steps.stamps');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();
  const { data: designs = [] } = useDesigns(businessId);
  const existingDesign = designs[0];
  const ctx = useWizardStep();

  const { formData, pendingStripFile, setPendingStripFile, designContext } =
    useDesignStepState(existingDesign);

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

        if (pendingStripFile) {
          const result = await uploadStripBackground(businessId, existingDesign.id, pendingStripFile);
          await updateDesign(businessId, existingDesign.id, { strip_background_url: result.url });
          setPendingStripFile(null);
        }

        queryClient.invalidateQueries({ queryKey: designKeys.all(businessId) });
        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [businessId, formData, pendingStripFile, existingDesign?.id, queryClient, setPendingStripFile, ctx, tErr]);

  return (
    <DesignFormProvider value={designContext}>
      <div className="flex flex-col min-[1024px]:flex-row min-[1024px]:items-start gap-6 min-[1024px]:gap-8">
        <DesignPreviewPane />
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <header className="flex flex-col gap-1">
            <h2 className="wiz-h font-semibold text-[var(--foreground)]">
              {t('title')}
            </h2>
            <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
          </header>
          <StampsForm />
        </div>
      </div>
    </DesignFormProvider>
  );
}
