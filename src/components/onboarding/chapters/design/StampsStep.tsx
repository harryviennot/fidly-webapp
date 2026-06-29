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
import { isPointsProgram, type CardDesign } from '@/types';
import { DesignFormProvider } from '@/components/design/forms/DesignFormContext';
import { StampsForm } from '@/components/design/forms/StampsForm';
import { PointsForm } from '@/components/design/forms/PointsForm';
import { useWizardStep } from '../../wizard-context';
import { useDesignStepState } from './useDesignStepState';
import { DesignPreviewPane } from './DesignPreviewPane';
import { pruneEmptyLabelFields } from './pruneDesignFields';

/**
 * Chapter 5 step 2 — optional. Type-aware: for a stamp program it edits stamp /
 * reward icons + colors + the optional strip background; for a points program
 * it edits the points strip style, progress color, and per-reward icons. Both
 * write to the same design row that BrandingStep created.
 */
export function StampsStep() {
  const t = useTranslations('onboardingBusiness.chapters.design.steps.stamps');
  const tPoints = useTranslations('onboardingBusiness.chapters.design.steps.points');
  const tErr = useTranslations('onboardingBusiness.errors');
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();
  const { data: designs = [] } = useDesigns(businessId);
  const existingDesign = designs[0];
  const { data: program } = useDefaultProgram(businessId);
  const isPoints = isPointsProgram(program);
  const pointsRewards = isPoints ? program.config.rewards : [];
  const { mutateAsync: updateBusiness } = useUpdateBusiness(businessId);
  const ctx = useWizardStep();

  const tFooter = useTranslations('onboardingBusiness.footer.cta.design');

  const { formData, pendingStripFile, setPendingStripFile, designContext } =
    useDesignStepState(existingDesign, 'stamps');

  // The shared footer CTA key (`design.stamps`) reads "Save my stamps" — wrong
  // for a points card. Override it with the points label; the shell resets the
  // label on step change so the cleanup is belt-and-suspenders.
  useEffect(() => {
    if (!isPoints) return;
    ctx.setNextLabel(tFooter('points'));
    return () => ctx.setNextLabel(null);
  }, [isPoints, ctx, tFooter]);

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
          // The business accent is derived from the card's lead color with a
          // contrast-on-white check (getThemeColor picks it if dark enough,
          // else falls back to the background). Points cards have no stamp-fill
          // color, so use the progress accent the merchant picked for the
          // strip; stamps use the stamp-filled color as before.
          const bgHex = rgbToHex(data.background_color || 'rgb(28, 28, 30)');
          const leadHex = isPoints
            ? rgbToHex(data.progress_accent_color || data.stamp_filled_color || 'rgb(249, 115, 22)')
            : rgbToHex(data.stamp_filled_color || 'rgb(249, 115, 22)');
          const themeAccent = getThemeColor(leadHex, bgHex);
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
  }, [businessId, formData, pendingStripFile, existingDesign?.id, currentBusiness, updateBusiness, queryClient, setPendingStripFile, ctx, tErr, isPoints]);

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
              {isPoints ? tPoints('title') : t('title')}
            </h2>
            <p className="wiz-body text-[#7A7A7A]">
              {isPoints ? tPoints('subtitle') : t('subtitle')}
            </p>
          </header>
          <div className="animate-slide-up delay-80">
            {isPoints ? <PointsForm rewards={pointsRewards} /> : <StampsForm />}
          </div>
        </div>
        <DesignPreviewPane showAutoGenerate />
      </div>
    </DesignFormProvider>
  );
}
