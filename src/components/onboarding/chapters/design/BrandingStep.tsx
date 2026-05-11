'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { useDesigns, designKeys } from '@/hooks/use-designs';
import { createDesign, updateDesign, uploadLogo, activateDesign } from '@/api';
import { rgbToHex, hexToRgb, contrastRatio } from '@/lib/color-utils';
import {
  DesignFormProvider,
  type DesignFormContextValue,
} from '@/components/design/forms/DesignFormContext';
import { BrandingForm } from '@/components/design/forms/BrandingForm';
import { useWizardStep } from '../../wizard-context';
import { useWizardProgress } from '../../useWizardProgress';
import type { CardDesignCreate } from '@/types';
import type { BusinessInfoEntry } from '@/types/business';

const DEFAULT_DESIGN: CardDesignCreate = {
  name: '',
  organization_name: '',
  description: '',
  foreground_color: 'rgb(255, 255, 255)',
  background_color: 'rgb(28, 28, 30)',
  label_color: 'rgb(255, 255, 255)',
  stamp_filled_color: 'rgb(249, 115, 22)',
  stamp_empty_color: 'rgb(255, 255, 255)',
  stamp_border_color: 'rgb(255, 255, 255)',
  stamp_icon: 'checkmark',
  reward_icon: 'gift',
  icon_color: 'rgb(255, 255, 255)',
  secondary_fields: [],
  auxiliary_fields: [],
  back_fields: [],
};

/**
 * Chapter 5 step 1 — required. Creates the business's first card design
 * (with defaults for Stamps / Content / Back since this single step is the
 * required floor) and activates it. Reuses the shared `BrandingForm` so the
 * user sees the same controls they'd find on `/design/[id]` later.
 *
 * State is held locally for now because Branding is the only registered
 * design sub-step in this version. When Stamps / Content / Back come online,
 * this should be promoted to a shared `DesignChapterProvider` that spans
 * all four sub-steps.
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

  const [formData, setFormData] = useState<CardDesignCreate>(() => ({
    ...DEFAULT_DESIGN,
    organization_name: currentBusiness?.name ?? '',
    description: currentBusiness?.name ?? '',
    logo_url: currentBusiness?.logo_url ?? undefined,
  }));
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);

  // Re-seed from an existing design if the business already has one (the
  // user came back to edit Branding after a previous wizard run).
  useEffect(() => {
    if (existingDesign) setFormData({ ...existingDesign });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingDesign?.id]);

  const bgHex = rgbToHex(formData.background_color || 'rgb(28, 28, 30)');
  const labelHex = rgbToHex(formData.label_color || 'rgb(255, 255, 255)');
  const textHex = rgbToHex(formData.foreground_color || 'rgb(255, 255, 255)');

  const designContext: DesignFormContextValue = {
    formData,
    customColors,
    businessInfo: (currentBusiness?.settings?.business_info as BusinessInfoEntry[]) || [],
    showAdvancedStamps: false,
    bgHex,
    labelHex,
    textHex,
    accentHex: rgbToHex(formData.stamp_filled_color || 'rgb(249, 115, 22)'),
    iconHex: rgbToHex(formData.icon_color || 'rgb(255, 255, 255)'),
    emptyStampHex: rgbToHex(formData.stamp_empty_color || 'rgb(255, 255, 255)'),
    borderColorHex: rgbToHex(formData.stamp_border_color || 'rgb(255, 255, 255)'),
    labelContrast: contrastRatio(labelHex, bgHex),
    textContrast: contrastRatio(textHex, bgHex),
    updateField: (key, value) => setFormData((prev) => ({ ...prev, [key]: value })),
    updateColorField: (key, hex) => setFormData((prev) => ({ ...prev, [key]: hexToRgb(hex) })),
    addCustomColor: (hex) =>
      setCustomColors((prev) =>
        prev.some((c) => c.toLowerCase() === hex.toLowerCase()) ? prev : [...prev, hex]
      ),
    setShowAdvancedStamps: () => {},
    setIconColorOverridden: () => {},
    handleLogoUpload: async (file) => {
      setPendingLogoFile(file);
      const blobUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, logo_url: blobUrl }));
    },
    handleLogoClear: () => {
      setFormData((prev) => ({ ...prev, logo_url: undefined }));
      setPendingLogoFile(null);
    },
    handleStripBackgroundUpload: async () => {},
    handleStripBackgroundClear: () => {},
    toggleBusinessInfoKey: () => {},
  };

  useEffect(() => {
    ctx.setCanSkip(false);
    ctx.setSubmitHandler(async () => {
      if (!businessId) return { ok: false };
      try {
        // Strip translations (server-managed) and blob URLs (preview-only).
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
