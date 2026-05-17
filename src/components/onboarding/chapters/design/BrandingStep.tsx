'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { useDesigns, designKeys } from '@/hooks/use-designs';
import { useDefaultProgram } from '@/hooks/use-programs';
import { createDesign, updateDesign, uploadLogo } from '@/api';
import { applyTheme, getThemeColor } from '@/utils/theme';
import { rgbToHex } from '@/lib/color-utils';
import { DesignFormProvider } from '@/components/design/forms/DesignFormContext';
import { BrandingForm } from '@/components/design/forms/BrandingForm';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';
import { useDesignStepState } from './useDesignStepState';
import { DesignPreviewPane } from './DesignPreviewPane';
import { pruneEmptyLabelFields } from './pruneDesignFields';
import type { CardDesign, CardDesignCreate } from '@/types';

/**
 * Chapter 6 step 1 — required. Creates the business's card design (if it
 * doesn't exist yet). Activation is deferred to BackStep so strip
 * regeneration triggered by the logo upload has time to settle — activating
 * here races strip_status="regenerating" and 400s.
 *
 * v3 additions:
 *  - After `createDesign` succeeds, the new design is written synchronously
 *    into the React Query cache so re-entry (Back → Forward) immediately
 *    hits the update path instead of trying to re-create.
 *  - When the design has no logo but `businesses.logo_url` is set, the
 *    business logo is fetched as a Blob and queued as `pendingLogoFile` so
 *    the existing upload path stores a fresh, independent file under
 *    `card_designs.logo_url`.
 *  - DesignPreviewPane renders alongside the form (responsive).
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
  const { data: program } = useDefaultProgram(businessId);
  const ctx = useWizardStep();

  const { formData, pendingLogoFile, setPendingLogoFile, designContext } =
    useDesignStepState(existingDesign, 'branding');

  // Reuse the business logo as the design logo on first entry. The seeded
  // `formData.logo_url` already references the business URL (from
  // useDesignStepState), so we materialise it into a File once so the submit
  // path stores a fresh copy under `card_designs.logo_url`. Without this,
  // both records would share the same asset.
  const reusedLogoUrlRef = useRef<string | null>(null);
  useEffect(() => {
    // Only short-circuit when the existing design already has its OWN
    // logo set — that's the case where we should respect the design's
    // logo and not overwrite. When the design exists but has no logo
    // yet (typical mid-onboarding), still pull the business logo so
    // every new design ships with a logo by default.
    if (existingDesign?.logo_url) return;
    const businessLogoUrl = currentBusiness?.logo_url;
    if (!businessLogoUrl) return;
    if (reusedLogoUrlRef.current === businessLogoUrl) return;
    if (pendingLogoFile) return;
    if (formData.logo_url !== businessLogoUrl) return;
    reusedLogoUrlRef.current = businessLogoUrl;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(businessLogoUrl, { cache: 'no-cache' });
        if (!response.ok) return;
        const blob = await response.blob();
        if (cancelled) return;
        const file = new File([blob], 'business-logo.png', {
          type: blob.type || 'image/png',
        });
        setPendingLogoFile(file);
      } catch {
        // Network/CORS failure — keep the URL reference; non-fatal.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    currentBusiness?.logo_url,
    existingDesign,
    formData.logo_url,
    pendingLogoFile,
    setPendingLogoFile,
  ]);

  // Description is a hard requirement on Branding — the wallet pass needs
  // *something* below the logo, and saving an empty description is exactly
  // what produced the historical "loyalty program" mystery default. Gate
  // Continue until the user has typed something.
  useEffect(() => {
    const hasDescription = !!(formData.description ?? '').trim();
    ctx.setCanProceed(hasDescription);
  }, [formData.description, ctx]);

  useEffect(() => {
    ctx.setCanSkip(false);
    ctx.setSubmitHandler(async () => {
      if (!businessId) return { ok: false };
      try {
        const { translations, ...rest } = formData;
        void translations;
        const cleaned: CardDesignCreate = pruneEmptyLabelFields({
          ...rest,
          // Internal admin label — back-fills from the business name when
          // empty so the dashboard's design list stays readable.
          name: rest.name?.trim() || currentBusiness?.name || '',
          // Card title and card description are saved exactly as typed.
          // No business-name fallback, no program-name fallback, no
          // translated "Loyalty Card" fallback. Defaults have repeatedly
          // backfired (saved value gets reread on revisit and shows up as
          // a clobbered "default" the user never picked) — empty is the
          // safer baseline. The wallet pass simply renders with just the
          // logo header when the title is blank.
          organization_name: rest.organization_name?.trim() ?? '',
          description: rest.description?.trim() ?? '',
        });
        if (cleaned.logo_url?.startsWith('blob:')) delete cleaned.logo_url;
        // Drop the business logo URL — we'll upload a fresh file under the
        // design via `pendingLogoFile` (queued above) so the two records hold
        // independent assets.
        if (
          pendingLogoFile &&
          cleaned.logo_url &&
          cleaned.logo_url === currentBusiness?.logo_url
        ) {
          delete cleaned.logo_url;
        }

        let designId: string;
        if (existingDesign?.id) {
          designId = existingDesign.id;
          // Skip the per-save strip regen during onboarding — the chapter-
          // exit hook fires one explicit regenerate-strips call so all the
          // user's color/icon edits coalesce into a single render.
          const updated = await updateDesign(businessId, designId, cleaned, {
            regenerateStrips: false,
          });
          // Sync the cache immediately so the next wizard step (which mounts
          // a fresh `useDesignStepState`) initialises from the just-saved
          // design, not the stale pre-update copy. Without this the user
          // sees "their colors from a previous logo" until the background
          // invalidate-refetch lands.
          queryClient.setQueryData<CardDesign[]>(designKeys.all(businessId), (prev) => {
            if (!prev) return [updated];
            return prev.map((d) => (d.id === designId ? updated : d));
          });
        } else {
          const created = await createDesign(businessId, cleaned);
          queryClient.setQueryData<CardDesign[]>(
            designKeys.all(businessId),
            [created]
          );
          designId = created.id;
        }

        if (pendingLogoFile) {
          const result = await uploadLogo(businessId, designId, pendingLogoFile);
          const withLogo = await updateDesign(
            businessId,
            designId,
            { ...cleaned, logo_url: result.url },
            { regenerateStrips: false }
          );
          // Second sync — logo upload changes logo_url, the rest of the
          // design state hasn't moved but we still want the cache to
          // hold the freshest server-confirmed row.
          queryClient.setQueryData<CardDesign[]>(designKeys.all(businessId), (prev) => {
            if (!prev) return [withLogo];
            return prev.map((d) => (d.id === designId ? withLogo : d));
          });
          setPendingLogoFile(null);
        }

        if (currentBusiness) {
          // Persist the picked colors to business.settings so the dashboard
          // and the rest of the wizard pick them up. `getThemeColor` falls
          // back to the background when the stamp-filled color has poor
          // contrast on white, so the resulting accent stays readable.
          //
          // CRITICAL: send ONLY the keys we're changing — do NOT spread
          // `currentBusiness.settings`. The cached `currentBusiness` can
          // be stale relative to recent saves (e.g. DataCollectionStep's
          // background save fired moments earlier), and the backend's
          // shallow-merge would happily resurrect old values from our
          // stale spread.
          const stampFilledHex = rgbToHex(cleaned.stamp_filled_color || 'rgb(249, 115, 22)');
          const bgHex = rgbToHex(cleaned.background_color || 'rgb(28, 28, 30)');
          const themeAccent = getThemeColor(stampFilledHex, bgHex);
          await updateBusiness({
            settings: {
              design_reviewed: true,
              accentColor: themeAccent,
              backgroundColor: bgHex,
            },
          });
          // Update the wizard chrome live — the orange seed from the
          // layout's mount-effect is replaced with the business's chosen
          // palette as soon as the user saves Branding.
          applyTheme(themeAccent, bgHex);
        }
        await updatePayload({ design_id: designId });
        queryClient.invalidateQueries({ queryKey: designKeys.all(businessId) });
        // Note: regenerate_strips=false stays on BrandingStep because logo
        // upload is the heavy save. The strip pre-gen kicked off by
        // createDesign already covers the initial state; StampsStep is
        // where strip-affecting fields actually change, and that's where
        // the regen now lives (default true).

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

  // Gate render on program data so defaults compute against the loaded
  // program. Without this guard the lazy `useState` in `useDesignStepState`
  // would seed an empty description and the user would see "Loyalty Card"
  // for a frame before the program-name sync ran. Blocking the first paint
  // is cheaper than fixing it after the fact with band-aid effects.
  if (program === undefined) {
    return null;
  }

  return (
    <DesignFormProvider value={designContext}>
      <DesignChapterLayout>
        <header className="flex flex-col gap-1 animate-slide-up">
          <h2 className="wiz-h font-semibold text-[var(--foreground)]">
            {t('title')}
          </h2>
          <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
        </header>
        <div className="animate-slide-up delay-80">
          <BrandingForm />
        </div>
      </DesignChapterLayout>
    </DesignFormProvider>
  );
}

function DesignChapterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-[1024px]:flex-row gap-6 min-[1024px]:gap-8">
      <div className="flex-1 flex flex-col gap-6 min-w-0">{children}</div>
      <DesignPreviewPane showAutoGenerate />
    </div>
  );
}
