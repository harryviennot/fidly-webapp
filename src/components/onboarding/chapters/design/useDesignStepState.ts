'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useBusiness } from '@/contexts/business-context';
import { rgbToHex, hexToRgb, contrastRatio } from '@/lib/color-utils';
import { useLogoPalette } from '@/hooks/use-logo-palette';
import { useDefaultProgram } from '@/hooks/use-programs';
import { useStepSeen, useWizardStep } from '../../wizard-context';
import type { AutoGenerateState, DesignFormContextValue } from '@/components/design/forms/DesignFormContext';
import type { CardDesign, CardDesignCreate } from '@/types';
import type { BusinessInfoEntry, Business } from '@/types/business';
import type { LoyaltyProgram } from '@/types/program';
import type { ThemeVariant } from '@/lib/theme-variants';
import {
  type BusinessTypeDefaults,
  getBusinessTypeDefaults,
  PROFILE_BUSINESS_TYPE_DRAFT_KEY,
} from '../../businessTypeDefaults';

export type DesignSubStepKey = 'branding' | 'stamps' | 'content' | 'back';

interface ComputeInitialFormDataArgs {
  existingDesign: CardDesign | undefined;
  currentBusiness: Business | null | undefined;
  program: LoyaltyProgram | null | undefined;
  /** Whether the user has previously visited this sub-step (and thus seen
   *  the defaults render at least once). Defaults are skipped when `true` —
   *  any missing values are kept as-is rather than reseeded. */
  seen: boolean;
  /** Translation function for the editor namespace (`designEditor.editor`). */
  t: (key: string) => string;
  /** Step-2 smart defaults that seed colours + icons on first visit. */
  bizDefaults: BusinessTypeDefaults;
}

/**
 * Pure initial-state builder for a design wizard sub-step. Extracted so the
 * default behaviour is testable without React. Lives outside the hook so the
 * lazy `useState` initialiser can call it once on first render.
 *
 * Default rules:
 *   - When an `existingDesign` row already exists, the saved values win for
 *     every field. The user has been here before; their data is the source
 *     of truth.
 *   - When the design row exists but a specific field is empty AND `seen`
 *     is false, fall back to the contextual default (program name for
 *     description, business logo for logo, reward field with program reward
 *     for secondary_fields).
 *   - When no design exists yet, seed from `DEFAULT_DESIGN` with the same
 *     contextual defaults for the empty fields.
 *   - Once `seen` is true, every empty field stays empty. The user removed
 *     the value on purpose; do not resurrect the default.
 */
export function computeInitialFormData({
  existingDesign,
  currentBusiness,
  program,
  seen,
  t,
  bizDefaults,
}: ComputeInitialFormDataArgs): CardDesignCreate {
  const defaultRewardField = () => ({
    key: 'reward',
    label: t('defaultRewardLabel'),
    value: program?.reward_name ?? '',
  });

  // Tag the design to the program type so the wizard preview renders the right
  // surface (points strip vs stamp grid) and every design sub-step's save
  // preserves it. Existing rows keep their stored card_type when set.
  const programCardType = program?.type === 'points' ? 'points' : 'stamp';

  if (existingDesign) {
    const seeded = { ...existingDesign } as CardDesignCreate;
    if (!seeded.card_type) seeded.card_type = programCardType;
    // Internal admin label — never overwrites a saved value. Falls back to
    // the business name when blank so the dashboard's design list stays
    // readable. This is independent of the `organization_name` (title)
    // shown on the wallet pass, which intentionally stays empty.
    if (!seeded.name) {
      seeded.name = currentBusiness?.name ?? '';
    }
    // Fall back to the business logo when the design has no logo yet —
    // BrandingStep materialises this URL into a fresh File on upload so
    // the two records hold independent assets.
    if (!seeded.logo_url && currentBusiness?.logo_url) {
      seeded.logo_url = currentBusiness.logo_url;
    }
    // First-time defaults — only on initial visit. The user's deliberate
    // empties stick around once `seen` is true.
    //
    // We seed `description` with the program name and the reward
    // secondary field with the program reward. `organization_name` (the
    // wallet title) stays empty — there's no good universal default for it.
    //
    // Note: this is a UI-level prefill, not a save-time fallback.
    // BrandingStep saves exactly what's in the input, so the historical
    // loop where "default" got saved and then re-read as a stuck value
    // can't repeat — if the user edits or clears the field, that's what
    // gets persisted.
    if (!seen) {
      if (!seeded.description && program?.name) {
        seeded.description = program.name;
      }
      if (!seeded.secondary_fields || seeded.secondary_fields.length === 0) {
        seeded.secondary_fields = [defaultRewardField()];
      }
    }
    return seeded;
  }

  // No design exists yet — seed from DEFAULT_DESIGN with first-visit
  // contextual prefills. See note above for the seeding rationale. Background,
  // stamp-filled colour and the two icons come from step 2's smart defaults
  // so a café owner sees a coffee card and a beauty salon sees a rose one
  // before they touch anything.
  const base: CardDesignCreate = {
    ...buildDefaultDesign(bizDefaults),
    name: currentBusiness?.name ?? '',
    organization_name: '',
    logo_url: currentBusiness?.logo_url ?? undefined,
    card_type: programCardType,
  };
  if (!seen) {
    if (program?.name) base.description = program.name;
    base.secondary_fields = [defaultRewardField()];
  }
  return base;
}

function buildDefaultDesign(bizDefaults: BusinessTypeDefaults): CardDesignCreate {
  return {
    name: '',
    organization_name: '',
    description: '',
    foreground_color: 'rgb(255, 255, 255)',
    background_color: bizDefaults.backgroundColor,
    label_color: 'rgb(255, 255, 255)',
    stamp_filled_color: bizDefaults.stampFilledColor,
    stamp_empty_color: 'rgb(255, 255, 255)',
    stamp_border_color: 'rgb(255, 255, 255)',
    stamp_icon: bizDefaults.stampIcon,
    reward_icon: bizDefaults.rewardIcon,
    icon_color: 'rgb(255, 255, 255)',
    secondary_fields: [],
    auxiliary_fields: [],
    back_fields: [],
  };
}

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
/** Wizard draft-store key for the design chapter's custom-color history.
 *  Shared across all four design sub-steps so user-picked colors survive
 *  forward/back navigation and a page reload. */
const CUSTOM_COLORS_DRAFT_KEY = 'design.customColors';

export function useDesignStepState(
  existingDesign: CardDesign | undefined,
  stepKey: DesignSubStepKey
): DesignStepState {
  const { currentBusiness } = useBusiness();
  const t = useTranslations('designEditor.editor');
  const wizardCtx = useWizardStep();
  // Read the cached program to prefill the first secondary field with the
  // reward name. The design chapter is gated behind the program step at the
  // step-component level (early-return until program loads), so by the time
  // this hook runs the program data is in cache.
  const { data: program } = useDefaultProgram(currentBusiness?.id);
  // Step-2 smart defaults — palette + initial colour seeds + icon seeds for
  // first-visit users. Once an existing design row exists, its saved values
  // override these (handled inside `computeInitialFormData`).
  //
  // Read the wizard draft before falling back to the persisted settings: the
  // draft is updated synchronously the moment ProfileStep's chip is clicked,
  // whereas `settings.business_type` lags by a few hundred ms behind the
  // background save. Without this, the design step that mounts immediately
  // after Continue seeds defaults from the universal `other` profile.
  const draftedBusinessType = wizardCtx.getDraft<string>(PROFILE_BUSINESS_TYPE_DRAFT_KEY);
  const bizDefaults = getBusinessTypeDefaults(
    draftedBusinessType || currentBusiness?.settings?.business_type
  );

  // Step-seen tracks whether the user has visited this sub-step before. We
  // snapshot the pre-mount value so defaults apply on the very first render
  // (where `seen` is false) and the post-render `markSeen` doesn't flip the
  // value mid-tree.
  const { seen } = useStepSeen(`design.${stepKey}`);

  const [formData, setFormData] = useState<CardDesignCreate>(() =>
    computeInitialFormData({
      existingDesign,
      currentBusiness,
      program,
      seen,
      t,
      bizDefaults,
    })
  );
  // Hydrate from the wizard draft store so the history persists across
  // step navigation (and a reload, since the draft store is localStorage-
  // backed). The sub-step component that owns this hook unmounts when the
  // user navigates forward, which would otherwise wipe local-only state.
  const [customColors, setCustomColors] = useState<string[]>(
    () => wizardCtx.getDraft<string[]>(CUSTOM_COLORS_DRAFT_KEY) ?? []
  );
  const [showAdvancedStamps, setShowAdvancedStamps] = useState(false);
  const [iconColorOverridden, setIconColorOverridden] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingStripFile, setPendingStripFile] = useState<File | null>(null);
  const [autoGenerateState, setAutoGenerateState] = useState<AutoGenerateState | null>(null);

  // Re-seed only when the design *row* changes (e.g. user nav'd into the
  // wizard from a separate tab that saved a different design). Crucially,
  // we capture the design id at mount and skip the effect on first render
  // — otherwise the lazy `useState` initial value gets clobbered by the
  // re-seed firing on the same id.
  const initialDesignIdRef = useRef<string | undefined>(existingDesign?.id);
  useEffect(() => {
    const currentId = existingDesign?.id;
    if (currentId === initialDesignIdRef.current) return;
    initialDesignIdRef.current = currentId;
    if (existingDesign) {
      // Cross-tab update — the external design row has been replaced under
      // us, so we recompute defaults from the freshly-fetched data. `seen`
      // is true here (we have a prior visit's worth of state), so the pure
      // builder respects user-emptied fields. This is a legitimate
      // setState-in-effect: the React state is being kept in sync with the
      // external row, not derived from another piece of React state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(
        computeInitialFormData({
          existingDesign,
          currentBusiness,
          program,
          seen: true,
          t,
          bizDefaults,
        })
      );
    }
  }, [existingDesign, currentBusiness, program, t, bizDefaults]);

  // Mirror customColors into the wizard draft store on every change so the
  // history is preserved across step navigation. `setDraft` is not a React
  // setState — it writes to a ref-backed store + localStorage — so this
  // doesn't trip the `set-state-in-effect` lint rule.
  useEffect(() => {
    wizardCtx.setDraft(CUSTOM_COLORS_DRAFT_KEY, customColors);
  }, [customColors, wizardCtx]);

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
    designId: existingDesign?.id,
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
    palette: bizDefaults.palette,
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
