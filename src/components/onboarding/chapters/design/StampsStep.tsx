'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { useDesigns, designKeys } from '@/hooks/use-designs';
import { useDefaultProgram } from '@/hooks/use-programs';
import { updateDesign, uploadStripBackground } from '@/api';
import { applyTheme, getThemeColor } from '@/utils/theme';
import { rgbToHex } from '@/lib/color-utils';
import type { CardDesign } from '@/types';
import { DesignFormProvider } from '@/components/design/forms/DesignFormContext';
import { StampsForm } from '@/components/design/forms/StampsForm';
import { useWizardStep } from '../../wizard-context';
import { useDesignStepState } from './useDesignStepState';
import { DesignPreviewPane } from './DesignPreviewPane';
import { pruneEmptyLabelFields } from './pruneDesignFields';

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
  const { data: program } = useDefaultProgram(businessId);
  const { mutateAsync: updateBusiness } = useUpdateBusiness(businessId);
  const ctx = useWizardStep();

  const { formData, pendingStripFile, setPendingStripFile, designContext } =
    useDesignStepState(existingDesign, 'stamps');

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

        // StampsStep is where strip-affecting fields actually change (icon,
        // colors, strip_background). Save with the default regenerate_strips
        // behaviour so the backend queues a fresh strip render here — by
        // the time the user has read Content + Back the PNGs are usually
        // ready, and BackStep polls strip_status briefly before activating
        // to absorb any remaining lag. Skipping regen here (the old
        // chapter-exit coalesce) was the reason a non-default stamp icon
        // showed correctly in the preview but pinned to the default on the
        // installed pkpass.
        const updated = await updateDesign(businessId, existingDesign.id, data);
        queryClient.setQueryData<CardDesign[]>(designKeys.all(businessId), (prev) => {
          if (!prev) return [updated];
          return prev.map((d) => (d.id === existingDesign.id ? updated : d));
        });

        if (pendingStripFile) {
          const result = await uploadStripBackground(businessId, existingDesign.id, pendingStripFile);
          const withStrip = await updateDesign(
            businessId,
            existingDesign.id,
            { strip_background_url: result.url }
          );
          queryClient.setQueryData<CardDesign[]>(designKeys.all(businessId), (prev) => {
            if (!prev) return [withStrip];
            return prev.map((d) => (d.id === existingDesign.id ? withStrip : d));
          });
          setPendingStripFile(null);
        }

        queryClient.invalidateQueries({ queryKey: designKeys.all(businessId) });

        // Persist updated colors to business.settings. Stamps step lets the
        // user fine-tune the stamp-filled color, so the theme accent may
        // have shifted since Branding ran. Re-running getThemeColor here
        // keeps the contrast swap honest.
        if (currentBusiness) {
          // Send ONLY the diff — see BrandingStep for the race rationale.
          const stampFilledHex = rgbToHex(data.stamp_filled_color || 'rgb(249, 115, 22)');
          const bgHex = rgbToHex(data.background_color || 'rgb(28, 28, 30)');
          const themeAccent = getThemeColor(stampFilledHex, bgHex);
          await updateBusiness({
            settings: {
              accentColor: themeAccent,
              backgroundColor: bgHex,
            },
          });
          applyTheme(themeAccent, bgHex);
        }
        return { ok: true };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('saveFailed'));
        return { ok: false };
      }
    });
    return () => ctx.setSubmitHandler(null);
  }, [businessId, formData, pendingStripFile, existingDesign?.id, currentBusiness, updateBusiness, queryClient, setPendingStripFile, ctx, tErr]);

  // Gate render on program data so the design state initialiser sees the
  // resolved program name. See BrandingStep for the rationale.
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
          </header>
          <div className="animate-slide-up delay-80">
            <StampsForm />
          </div>
        </div>
        <DesignPreviewPane showAutoGenerate />
      </div>
    </DesignFormProvider>
  );
}
