'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { useDesigns, designKeys } from '@/hooks/use-designs';
import { createDesign, updateDesign, uploadLogo } from '@/api';
import { DesignFormProvider } from '@/components/design/forms/DesignFormContext';
import { BrandingForm } from '@/components/design/forms/BrandingForm';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';
import { useDesignStepState } from './useDesignStepState';
import { DesignPreviewPane } from './DesignPreviewPane';
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
  const ctx = useWizardStep();

  const { formData, pendingLogoFile, setPendingLogoFile, designContext } =
    useDesignStepState(existingDesign);

  // Reuse the business logo as the design logo on first entry. The seeded
  // `formData.logo_url` already references the business URL (from
  // useDesignStepState), so we materialise it into a File once so the submit
  // path stores a fresh copy under `card_designs.logo_url`. Without this,
  // both records would share the same asset.
  const reusedLogoUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (existingDesign) return; // Design already exists; respect its own logo.
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
          await updateDesign(businessId, designId, cleaned);
        } else {
          const created = await createDesign(businessId, cleaned);
          // Seed the cache synchronously so a Back → Forward navigation reads
          // the new design and stays on the update path (prevents duplicate
          // createDesign attempts under stale-cache conditions).
          queryClient.setQueryData<CardDesign[]>(
            designKeys.all(businessId),
            [created]
          );
          designId = created.id;
        }

        if (pendingLogoFile) {
          const result = await uploadLogo(businessId, designId, pendingLogoFile);
          await updateDesign(businessId, designId, { ...cleaned, logo_url: result.url });
          setPendingLogoFile(null);
        }

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
    <DesignFormProvider value={designContext}>
      <DesignChapterLayout>
        <header className="flex flex-col gap-1">
          <h2 className="text-[20px] min-[768px]:text-[24px] font-semibold text-[var(--foreground)]">
            {t('title')}
          </h2>
          <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
        </header>
        <BrandingForm />
      </DesignChapterLayout>
    </DesignFormProvider>
  );
}

function DesignChapterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-[1024px]:flex-row min-[1024px]:items-start gap-6 min-[1024px]:gap-8">
      <DesignPreviewPane />
      <div className="flex-1 flex flex-col gap-6 min-w-0">{children}</div>
    </div>
  );
}
