'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useBusiness } from '@/contexts/business-context';
import { rgbToHex, hexToRgb, contrastRatio } from '@/lib/color-utils';
import { useLogoPalette } from '@/hooks/use-logo-palette';
import { useDefaultProgram } from '@/hooks/use-programs';
import type { AutoGenerateState, DesignFormContextValue } from '@/components/design/forms/DesignFormContext';
import type { CardDesign, CardDesignCreate } from '@/types';
import type { BusinessInfoEntry } from '@/types/business';
import type { ThemeVariant } from '@/lib/theme-variants';

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

export interface DesignStepState {
  /** Form data being edited. Seeded from `existingDesign` on first render. */
  formData: CardDesignCreate;
  setFormData: React.Dispatch<React.SetStateAction<CardDesignCreate>>;
  /** Pending logo / strip background blobs to upload on save. */
  pendingLogoFile: File | null;
  setPendingLogoFile: (f: File | null) => void;
  pendingStripFile: File | null;
  setPendingStripFile: (f: File | null) => void;
  /** Context value to feed `<DesignFormProvider>`. */
  designContext: DesignFormContextValue;
}

/**
 * Reusable state harness for design wizard sub-steps. Each step owns its own
 * instance; they share nothing in memory, but they all read/write the SAME
 * design row on the backend so subsequent steps pick up prior edits via
 * the existing-design query. Avoids a full state-hoist provider while still
 * keeping the shared `DesignFormContext` API.
 *
 * Drop-in for: BrandingStep, StampsStep, ContentStep, BackStep.
 */
export function useDesignStepState(existingDesign: CardDesign | undefined): DesignStepState {
  const { currentBusiness } = useBusiness();
  const t = useTranslations('designEditor.editor');
  // Read the cached program to prefill the first secondary field with the
  // reward name. By the time the user is on the design chapter they've
  // already gone through the Program step, so `useDefaultProgram` resolves
  // synchronously from the React Query cache.
  const { data: program } = useDefaultProgram(currentBusiness?.id);

  const defaultRewardField = () => ({
    key: 'reward',
    label: t('defaultRewardLabel'),
    value: program?.reward_name ?? '',
  });

  const [formData, setFormData] = useState<CardDesignCreate>(() => {
    if (existingDesign) {
      const seeded = { ...existingDesign };
      // Seed the reward field on existing designs that were created with
      // empty secondary_fields (e.g. BrandingStep saved before Content was
      // touched). Without this the Content sub-step opens to an empty form
      // when the user already had a reward name set up in Program.
      if (!seeded.secondary_fields || seeded.secondary_fields.length === 0) {
        seeded.secondary_fields = [defaultRewardField()];
      }
      return seeded;
    }
    return {
      ...DEFAULT_DESIGN,
      organization_name: currentBusiness?.name ?? '',
      description: currentBusiness?.name ?? '',
      logo_url: currentBusiness?.logo_url ?? undefined,
      secondary_fields: [defaultRewardField()],
    };
  });
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [showAdvancedStamps, setShowAdvancedStamps] = useState(false);
  const [iconColorOverridden, setIconColorOverridden] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingStripFile, setPendingStripFile] = useState<File | null>(null);
  const [autoGenerateState, setAutoGenerateState] = useState<AutoGenerateState | null>(null);

  // Re-seed if the design row changes underneath us (e.g. user nav'd into the
  // wizard from a separate tab that updated the design).
  useEffect(() => {
    if (existingDesign) setFormData({ ...existingDesign });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingDesign?.id]);

  const { palette: extractedPalette, isLoading: isPaletteLoading } = useLogoPalette(
    formData.logo_url
  );

  const applyThemeVariant = (variant: ThemeVariant) => {
    setFormData((prev) => ({
      ...prev,
      background_color: hexToRgb(variant.background),
      foreground_color: hexToRgb(variant.foreground),
      label_color: hexToRgb(variant.label),
      stamp_filled_color: hexToRgb(variant.stampFilled),
      stamp_empty_color: hexToRgb(variant.stampEmpty),
      stamp_border_color: hexToRgb(variant.stampBorder),
      icon_color: hexToRgb(variant.iconColor),
    }));
  };

  const bgHex = rgbToHex(formData.background_color || 'rgb(28, 28, 30)');
  const labelHex = rgbToHex(formData.label_color || 'rgb(255, 255, 255)');
  const textHex = rgbToHex(formData.foreground_color || 'rgb(255, 255, 255)');
  const accentHex = rgbToHex(formData.stamp_filled_color || 'rgb(249, 115, 22)');
  const iconHex = rgbToHex(formData.icon_color || 'rgb(255, 255, 255)');
  const emptyStampHex = rgbToHex(formData.stamp_empty_color || 'rgb(255, 255, 255)');
  const borderColorHex = rgbToHex(formData.stamp_border_color || 'rgb(255, 255, 255)');

  const designContext: DesignFormContextValue = {
    formData,
    customColors,
    businessInfo: (currentBusiness?.settings?.business_info as BusinessInfoEntry[]) || [],
    showAdvancedStamps,
    bgHex,
    labelHex,
    textHex,
    accentHex,
    iconHex,
    emptyStampHex,
    borderColorHex,
    labelContrast: contrastRatio(labelHex, bgHex),
    textContrast: contrastRatio(textHex, bgHex),
    updateField: (key, value) => setFormData((prev) => ({ ...prev, [key]: value })),
    updateColorField: (key, hex) => setFormData((prev) => ({ ...prev, [key]: hexToRgb(hex) })),
    addCustomColor: (hex) =>
      setCustomColors((prev) => {
        // Newest-first: a freshly-picked color slots into position 0 of the
        // right zone, immediately after the separator. If it already exists
        // in the list, promote it to the front so it stays surfaced.
        const filtered = prev.filter((c) => c.toLowerCase() !== hex.toLowerCase());
        return [hex, ...filtered];
      }),
    setShowAdvancedStamps,
    setIconColorOverridden: (v) => {
      setIconColorOverridden(v);
      // Reference to keep TS happy that the value is consumed.
      void iconColorOverridden;
    },
    handleLogoUpload: async (file) => {
      setPendingLogoFile(file);
      const blobUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, logo_url: blobUrl }));
    },
    handleLogoClear: () => {
      setFormData((prev) => ({ ...prev, logo_url: undefined }));
      setPendingLogoFile(null);
    },
    handleStripBackgroundUpload: async (file) => {
      setPendingStripFile(file);
      const blobUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, strip_background_url: blobUrl }));
    },
    handleStripBackgroundClear: () => {
      setFormData((prev) => ({ ...prev, strip_background_url: undefined }));
      setPendingStripFile(null);
    },
    toggleBusinessInfoKey: (key) => {
      setFormData((prev) => {
        const current = prev.hidden_business_info_keys || [];
        const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
        return { ...prev, hidden_business_info_keys: next };
      });
    },
    extractedPalette,
    isPaletteLoading,
    applyThemeVariant,
    autoGenerateState,
    setAutoGenerateState,
  };

  return {
    formData,
    setFormData,
    pendingLogoFile,
    setPendingLogoFile,
    pendingStripFile,
    setPendingStripFile,
    designContext,
  };
}
