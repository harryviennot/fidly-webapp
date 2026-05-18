'use client';

import { useState, useMemo, useImperativeHandle, forwardRef, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { CardDesign, CardDesignCreate } from '@/types';
import { createDesign, updateDesign, uploadLogo, uploadStripBackground, activateDesign } from '@/api';
import { designKeys } from '@/hooks/use-designs';
import { useBusiness } from '@/contexts/business-context';
import { EditorCard } from '@/components/card';
import { GoogleWalletCard } from '@/components/card/GoogleWalletCard';
import { ScaledCardWrapper } from './ScaledCardWrapper';
import { CollapsibleSection } from './CollapsibleSection';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Eye, SlidersHorizontal, Palette, Stamp, TextT, ArrowUDownLeft } from '@phosphor-icons/react';
import { getEntryLabel, getEntryPreview } from '@/lib/business-info-utils';
import type { BusinessInfoEntry } from '@/types/business';
import { useMediaQuery } from '@/hooks/use-media-query';
import { rgbToHex, hexToRgb, autoIconColor, contrastRatio } from '@/lib/color-utils';
import { useLogoPalette } from '@/hooks/use-logo-palette';
import type { ThemeVariant } from '@/lib/theme-variants';
import { getDesignDraft, useDesignDraftPersistence } from '@/hooks/use-design-draft';
import { DesignFormProvider, type AutoGenerateState, type DesignFormContextValue } from './forms/DesignFormContext';
import { BrandingForm } from './forms/BrandingForm';
import { StampsForm } from './forms/StampsForm';
import { ContentForm } from './forms/ContentForm';
import { BackForm } from './forms/BackForm';

export interface DesignEditorRef {
  handleSave: () => Promise<boolean>;
  saving: boolean;
  isDirty: boolean;
  clearDraft: () => void;
}

interface DesignEditorV2Props {
  design?: CardDesign;
  isNew?: boolean;
  onSave?: () => void;
  onSavingChange?: (saving: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
  designName?: string;
  programTotalStamps?: number;
  programName?: string;
  programRewardName?: string | null;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
}

function getDefaultDesign(t: ReturnType<typeof useTranslations>, totalStamps: number, rewardName?: string | null): CardDesignCreate {
  return {
    name: '',
    organization_name: '',
    description: '',
    logo_text: '',
    foreground_color: 'rgb(255, 255, 255)',
    background_color: 'rgb(28, 28, 30)',
    label_color: 'rgb(255, 255, 255)',
    stamp_filled_color: 'rgb(249, 115, 22)',
    stamp_empty_color: 'rgb(255, 255, 255)',
    stamp_border_color: 'rgb(255, 255, 255)',
    stamp_icon: 'checkmark',
    reward_icon: 'gift',
    icon_color: 'rgb(255, 255, 255)',
    secondary_fields: [{ key: 'reward', label: t('defaultRewardLabel'), value: rewardName || t('defaultRewardValue', { count: totalStamps }) }],
    auxiliary_fields: [],
    back_fields: [],
  };
}

// Section completion heuristics
function isBrandingComplete(d: CardDesignCreate & { logo_url?: string }) {
  return !!(d.description && d.background_color);
}

function isStampsComplete(d: CardDesignCreate) {
  return !!(d.stamp_filled_color && d.stamp_icon);
}

function isContentComplete(d: CardDesignCreate) {
  return (d.secondary_fields?.length ?? 0) > 0;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isBackComplete(_d: CardDesignCreate) {
  return true;
}

/**
 * Resolves image field updates for a design save.
 * Only includes logo_url / strip_background_url in the returned object when they were
 * explicitly changed (new file uploaded or explicitly cleared). Unchanged images are
 * omitted so the backend's change-detection logic stays accurate.
 */
async function resolveImageUpdates(
  businessId: string,
  designId: string,
  existing: { logo_url?: string; strip_background_url?: string },
  pending: {
    logo: { file: File | null; cleared: boolean };
    strip: { file: File | null; cleared: boolean };
  },
): Promise<Partial<CardDesignCreate>> {
  const updates: Partial<CardDesignCreate> = {};

  if (pending.logo.file) {
    const result = await uploadLogo(businessId, designId, pending.logo.file);
    updates.logo_url = result.url;
  } else if (pending.logo.cleared && existing.logo_url) {
    updates.logo_url = null as unknown as string;
  }

  if (pending.strip.file) {
    const result = await uploadStripBackground(businessId, designId, pending.strip.file);
    updates.strip_background_url = result.url;
  } else if (pending.strip.cleared && existing.strip_background_url) {
    updates.strip_background_url = null as unknown as string;
  }

  return updates;
}

const DesignEditorV2 = forwardRef<DesignEditorRef, DesignEditorV2Props>(
  function DesignEditorV2({ design, isNew = false, onSave, onSavingChange, onDirtyChange, designName, programTotalStamps, programName, programRewardName, headerLeft, headerRight }, ref) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { currentBusiness } = useBusiness();
    const t = useTranslations('designEditor.editor');
    const isWideEnough = useMediaQuery('(min-width: 1280px)');
    const isCompact = !isWideEnough;
    const totalStamps = programTotalStamps ?? 10;

    const draftId = design?.id ?? 'new';
    const defaultRewardField = { key: 'reward', label: t('defaultRewardLabel'), value: programRewardName || t('defaultRewardValue', { count: totalStamps }) };
    const [formData, setFormData] = useState<CardDesignCreate>(() => {
      const defaultData = design ? { ...design } : getDefaultDesign(t, totalStamps, programRewardName);
      const draft = getDesignDraft(draftId);
      if (draft) {
        // Use draft if it's newer than the server data
        const serverTime = design?.updated_at ? new Date(design.updated_at).getTime() : 0;
        if (draft.lastModified > serverTime) {
          const merged = { ...defaultData, ...draft.data };
          // For new designs, always use fresh program-derived defaults for secondary_fields
          // so stale drafts don't overwrite the reward name pre-fill
          if (!design) merged.secondary_fields = defaultData.secondary_fields;
          return merged;
        }
      }
      // For existing designs with no secondary fields, pre-populate with
      // the default reward field (in dirty state — not saved until user saves)
      if (design && (!defaultData.secondary_fields || defaultData.secondary_fields.length === 0)) {
        defaultData.secondary_fields = [defaultRewardField];
      }
      return defaultData;
    });
    const [isActive, setIsActive] = useState(design?.is_active ?? false);
    const [previewStamps, setPreviewStamps] = useState(3);
    const [showBack, setShowBack] = useState(false);
    const [previewWallet, setPreviewWallet] = useState<'apple' | 'google'>('apple');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mobileShowPreview, setMobileShowPreview] = useState(false);
    const [showAdvancedStamps, setShowAdvancedStamps] = useState(false);
    const [iconColorOverridden, setIconColorOverridden] = useState(false);
    const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
    const [pendingStripFile, setPendingStripFile] = useState<File | null>(null);
    const [customColors, setCustomColors] = useState<string[]>([]);
    const [autoGenerateState, setAutoGenerateState] = useState<AutoGenerateState | null>(null);

    const previewDesign = useMemo(() => {
      const businessInfo = (currentBusiness?.settings?.business_info as BusinessInfoEntry[]) || [];
      const hiddenKeys = formData.hidden_business_info_keys || [];
      const visibleBizFields = businessInfo
        .filter((e) => !hiddenKeys.includes(e.key))
        .map((e) => ({ key: e.key, label: getEntryLabel(e), value: getEntryPreview(e) }));
      return { ...formData, back_fields: [...(formData.back_fields || []), ...visibleBizFields] };
    }, [formData, currentBusiness?.settings?.business_info]);

    const addCustomColor = useCallback((hex: string) => {
      setCustomColors((prev) => {
        // Newest-first ordering: see useDesignStepState for the contract.
        const filtered = prev.filter((c) => c.toLowerCase() !== hex.toLowerCase());
        return [hex, ...filtered];
      });
    }, []);

    // Use ref to always have access to latest form data for save
    const formDataRef = useRef(formData);
    formDataRef.current = formData;

    // Draft persistence
    const { draftStatus, clearDraft } = useDesignDraftPersistence(draftId, formData, design?.updated_at);

    // Dirty state tracking
    const lastSavedDataRef = useRef(
      JSON.stringify(design ? { ...design } : getDefaultDesign(t, totalStamps, programRewardName))
    );
    const isDirty = JSON.stringify(formData) !== lastSavedDataRef.current;

    useEffect(() => {
      onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    const handleSave = useCallback(async (): Promise<boolean> => {
      if (!currentBusiness?.id) return false;
      const { translations, ...data } = formDataRef.current;
      void translations;
      if (!data.name || !data.description) {
        setError(t('requiredFields'));
        return false;
      }

      // Strip blob URLs before sending to API
      if (data.logo_url?.startsWith('blob:')) {
        delete data.logo_url;
      }
      if (data.strip_background_url?.startsWith('blob:')) {
        delete data.strip_background_url;
      }

      setSaving(true);
      onSavingChange?.(true);
      setError(null);

      try {
        if (isNew) {
          const created = await createDesign(currentBusiness.id, data);
          // Upload pending files with the new design ID
          if (pendingLogoFile) {
            const result = await uploadLogo(currentBusiness.id, created.id, pendingLogoFile);
            await updateDesign(currentBusiness.id, created.id, { ...data, logo_url: result.url });
            setPendingLogoFile(null);
          }
          if (pendingStripFile) {
            const result = await uploadStripBackground(currentBusiness.id, created.id, pendingStripFile);
            await updateDesign(currentBusiness.id, created.id, { ...data, strip_background_url: result.url });
            setPendingStripFile(null);
          }
          queryClient.invalidateQueries({ queryKey: designKeys.all(currentBusiness.id) });
          clearDraft();
          lastSavedDataRef.current = JSON.stringify(formDataRef.current);
          router.push(`/design/${created.id}`);
          return true;
        } else if (design) {
          // Strip image URL fields from the base payload — only include if explicitly changed
          const { logo_url, strip_background_url, ...updateData } = data;

          const imageUpdates = await resolveImageUpdates(
            currentBusiness.id,
            design.id,
            { logo_url: design.logo_url, strip_background_url: design.strip_background_url },
            {
              logo: { file: pendingLogoFile, cleared: logo_url === null },
              strip: { file: pendingStripFile, cleared: strip_background_url === null },
            },
          );
          setPendingLogoFile(null);
          setPendingStripFile(null);

          await updateDesign(currentBusiness.id, design.id, { ...updateData, ...imageUpdates });
          queryClient.invalidateQueries({ queryKey: designKeys.all(currentBusiness.id) });
          clearDraft();
          lastSavedDataRef.current = JSON.stringify(formDataRef.current);
          onSave?.();
          return true;
        }
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : t('failedToSave'));
        return false;
      } finally {
        setSaving(false);
        onSavingChange?.(false);
      }
    }, [currentBusiness?.id, isNew, design, router, queryClient, onSave, onSavingChange, pendingLogoFile, pendingStripFile, clearDraft, t]);

    useImperativeHandle(ref, () => ({
      handleSave,
      saving,
      isDirty,
      clearDraft,
    }), [handleSave, saving, isDirty, clearDraft]);

    // Cleanup blob URLs on unmount
    useEffect(() => {
      return () => {
        const logoUrl = formDataRef.current.logo_url;
        const stripUrl = formDataRef.current.strip_background_url;
        if (logoUrl?.startsWith('blob:')) URL.revokeObjectURL(logoUrl);
        if (stripUrl?.startsWith('blob:')) URL.revokeObjectURL(stripUrl);
      };
    }, []);

    // Collapsed sections state — only branding open by default
    const [openSections, setOpenSections] = useState({
      branding: true,
      stamps: false,
      content: false,
      back: false,
    });

    // Sync design name from page header
    useEffect(() => {
      if (designName !== undefined && designName !== formData.name) {
        updateField('name', designName);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [designName]);

    // Auto-fill organization name for new designs
    useEffect(() => {
      if (isNew && currentBusiness?.name && !formData.organization_name) {
        updateField('organization_name', currentBusiness.name);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentBusiness?.name, isNew]);

    // Auto-fill description from program name
    useEffect(() => {
      if (programName && isNew && !formData.description) {
        updateField('description', programName);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [programName, isNew]);

    // Progressive disclosure: auto-open next section when current becomes complete
    const prevCompleteRef = useRef({
      branding: isBrandingComplete(formData),
      stamps: isStampsComplete(formData),
      content: isContentComplete(formData),
    });
    useEffect(() => {
      const brandingNow = isBrandingComplete(formData);
      const stampsNow = isStampsComplete(formData);
      const contentNow = isContentComplete(formData);

      if (brandingNow && !prevCompleteRef.current.branding) {
        setTimeout(() => setOpenSections({ branding: false, stamps: true, content: false, back: false }), 300);
      }
      if (stampsNow && !prevCompleteRef.current.stamps) {
        setTimeout(() => setOpenSections({ branding: false, stamps: false, content: true, back: false }), 300);
      }
      if (contentNow && !prevCompleteRef.current.content) {
        setTimeout(() => setOpenSections({ branding: false, stamps: false, content: false, back: true }), 300);
      }

      prevCompleteRef.current = { branding: brandingNow, stamps: stampsNow, content: contentNow };
    }, [formData]);

    const toggleSection = (section: keyof typeof openSections) => {
      setOpenSections((prev) => {
        const isOpening = !prev[section];
        if (isOpening) {
          // Close all others, open this one
          return { branding: false, stamps: false, content: false, back: false, [section]: true };
        }
        // Just close this one
        return { ...prev, [section]: false };
      });
    };

    // Auto-calculate icon color from stamp brightness (unless user overrode it)
    useEffect(() => {
      if (!iconColorOverridden && formData.stamp_filled_color) {
        const stampHex = rgbToHex(formData.stamp_filled_color);
        const autoColor = autoIconColor(stampHex);
        const currentIconHex = rgbToHex(formData.icon_color || 'rgb(255, 255, 255)');
        if (autoColor !== currentIconHex) {
          setFormData((prev) => ({ ...prev, icon_color: hexToRgb(autoColor) }));
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.stamp_filled_color, iconColorOverridden]);

    const updateField = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const updateColorField = (key: 'background_color' | 'stamp_filled_color' | 'label_color' | 'foreground_color' | 'stamp_empty_color' | 'stamp_border_color' | 'icon_color', hexValue: string) => {
      updateField(key, hexToRgb(hexValue));
    };

    const { palette: extractedPalette, isLoading: isPaletteLoading } = useLogoPalette(formData.logo_url);

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

    const handleActivate = async () => {
      if (!design || !currentBusiness?.id) return;
      if (!confirm(t('activateConfirm'))) return;

      setSaving(true);
      setError(null);
      try {
        await activateDesign(currentBusiness.id, design.id);
        setIsActive(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('failedToActivate');
        if (message.includes('regenerat')) {
          setError('__generating__');
        } else {
          setError(message);
        }
      } finally {
        setSaving(false);
      }
    };

    const handleLogoUpload = async (file: File) => {
      // Always defer: store file and use blob URL for preview; upload happens on Save
      setPendingLogoFile(file);
      const blobUrl = URL.createObjectURL(file);
      updateField('logo_url', blobUrl);
    };

    const handleLogoClear = () => {
      updateField('logo_url', null as unknown as string);
      setPendingLogoFile(null);
    };

    const handleStripBackgroundUpload = async (file: File) => {
      // Always defer: store file and use blob URL for preview; upload happens on Save
      setPendingStripFile(file);
      const blobUrl = URL.createObjectURL(file);
      updateField('strip_background_url', blobUrl);
    };

    const handleStripBackgroundClear = () => {
      updateField('strip_background_url', null as unknown as string);
      setPendingStripFile(null);
    };

    const toggleBusinessInfoKey = (key: string) => {
      setFormData((prev) => {
        const current = prev.hidden_business_info_keys || [];
        const next = current.includes(key)
          ? current.filter((k) => k !== key)
          : [...current, key];
        return { ...prev, hidden_business_info_keys: next };
      });
    };

    // Current colors as hex for pickers
    const bgHex = rgbToHex(formData.background_color || 'rgb(28, 28, 30)');
    const accentHex = rgbToHex(formData.stamp_filled_color || 'rgb(249, 115, 22)');
    const iconHex = rgbToHex(formData.icon_color || 'rgb(255, 255, 255)');
    const labelHex = rgbToHex(formData.label_color || 'rgb(255, 255, 255)');
    const textHex = rgbToHex(formData.foreground_color || 'rgb(255, 255, 255)');
    const emptyStampHex = rgbToHex(formData.stamp_empty_color || 'rgb(255, 255, 255)');
    const borderColorHex = rgbToHex(formData.stamp_border_color || 'rgb(255, 255, 255)');

    // Contrast warnings
    const labelContrast = contrastRatio(labelHex, bgHex);
    const textContrast = contrastRatio(textHex, bgHex);

    // Section badges
    const brandingBadge = isBrandingComplete(formData) ? 'complete' as const : null;
    const stampsBadge = isStampsComplete(formData) ? 'complete' as const : null;
    const contentBadge = isContentComplete(formData) ? 'complete' as const : null;
    const backBadge = isBackComplete(formData) ? 'complete' as const : null;

    // ---- Shared context for the 4 sub-forms ----
    const businessInfo = (currentBusiness?.settings?.business_info as BusinessInfoEntry[]) || [];
    const designFormContext: DesignFormContextValue = {
      formData,
      customColors,
      businessInfo,
      showAdvancedStamps,
      bgHex,
      labelHex,
      textHex,
      accentHex,
      iconHex,
      emptyStampHex,
      borderColorHex,
      labelContrast,
      textContrast,
      updateField,
      updateColorField,
      addCustomColor,
      setShowAdvancedStamps,
      setIconColorOverridden,
      handleLogoUpload,
      handleLogoClear,
      handleStripBackgroundUpload,
      handleStripBackgroundClear,
      toggleBusinessInfoKey,
      extractedPalette,
      isPaletteLoading,
      applyThemeVariant,
      autoGenerateState,
      setAutoGenerateState,
    };

    // ---- Preview Panel ----
    const previewPanel = (
      <div className="flex flex-col items-center">
        {/* Live Preview Card */}
        <div className="w-full bg-white border border-[#EEEDEA] rounded-[14px] p-[18px] overflow-hidden">
          {/* Header: title + wallet toggle */}
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[15px] font-semibold text-foreground">{t('livePreview')}</span>
            <Tabs value={previewWallet} onValueChange={(v) => setPreviewWallet(v as 'apple' | 'google')}>
              <TabsList className="rounded-full bg-[#F4F2EE] p-0.5 h-auto">
                <TabsTrigger value="apple" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1 text-[11px] font-semibold">{t('appleWallet')}</TabsTrigger>
                <TabsTrigger value="google" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1 text-[11px] font-semibold">{t('googleWallet')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Card Preview with wallet switch animation */}
          <div className="flex items-center justify-center w-full">
            <div className="w-full">
              <div className="wallet-card-container">
                {/* Apple Wallet with flip */}
                <div className={`wallet-card ${previewWallet === 'apple' ? 'wallet-card-active' : 'wallet-card-left'}`}>
                  <div className="card-flip-container">
                    <div className={`card-flip-inner ${showBack ? 'flipped' : ''}`}>
                      <div className="card-flip-front">
                        <EditorCard
                          design={previewDesign}
                          previewStamps={previewStamps}
                          totalStamps={totalStamps}
                          organizationName={formData.organization_name}
                          showBack={false}
                        />
                      </div>
                      <div className="card-flip-back">
                        <EditorCard
                          design={previewDesign}
                          previewStamps={previewStamps}
                          totalStamps={totalStamps}
                          organizationName={formData.organization_name}
                          showBack={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Google Wallet with flip */}
                <div className={`wallet-card ${previewWallet === 'google' ? 'wallet-card-active' : 'wallet-card-right'}`}>
                  <div className="card-flip-container">
                    <div className={`card-flip-inner ${showBack ? 'flipped' : ''}`}>
                      <div className="card-flip-front">
                        <ScaledCardWrapper baseWidth={320} dynamicHeight>
                          <GoogleWalletCard
                            design={previewDesign}
                            stamps={previewStamps}
                            totalStamps={totalStamps}
                            organizationName={formData.organization_name}
                          />
                        </ScaledCardWrapper>
                      </div>
                      <div className="card-flip-back">
                        <ScaledCardWrapper baseWidth={320} dynamicHeight>
                          <GoogleWalletCard
                            design={previewDesign}
                            stamps={previewStamps}
                            totalStamps={totalStamps}
                            organizationName={formData.organization_name}
                            showBack
                          />
                        </ScaledCardWrapper>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* View Front/Back toggle bar */}
              <button
                type="button"
                onClick={() => setShowBack(!showBack)}
                className="w-full py-2 mt-3 border-t border-[#EEEDEA] text-[11px] font-semibold text-muted-foreground flex items-center justify-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Eye className="w-3.5 h-3.5" weight="bold" />
                {showBack ? t('viewFront') : t('viewBack')}
              </button>
            </div>
          </div>
        </div>

        {/* Slider + action buttons below the card */}
        <div className="mt-4 w-full flex flex-col items-center">
          {/* Stamp Slider */}
          {!showBack && (
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[11px] text-muted-foreground">{t('previewStamps')}</Label>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {previewStamps} / {totalStamps}
                </span>
              </div>
              <input
                type="range"
                className="styled-slider w-full"
                min={0}
                max={totalStamps}
                value={previewStamps}
                onChange={(e) => setPreviewStamps(parseInt(e.target.value))}
              />
            </div>
          )}

          {/* Desktop: Action buttons below preview */}
          <div className={`${isCompact ? 'hidden' : 'flex'} flex-col gap-3 mt-5 w-full`}>
            {design && !isActive && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleActivate}
                disabled={saving}
              >
                {t('activateDesign')}
              </Button>
            )}
          </div>
        </div>
      </div>
    );

    // ---- Form Panel ----
    const formPanel = (
      <DesignFormProvider value={designFormContext}>
      <div className="space-y-3">
        {/* Visual Identity Section */}
        <CollapsibleSection
          title={t('branding')}
          subtitle={t('brandingSubtitle')}
          icon={<Palette className="w-8 h-8 text-foreground" weight='regular' />}
          isOpen={openSections.branding}
          onToggle={() => toggleSection('branding')}
          badge={brandingBadge}
        >
          <BrandingForm />
        </CollapsibleSection>

        {/* Stamps Section */}
        <CollapsibleSection
          title={t('stampsSection')}
          subtitle={t('stampsSectionSubtitle')}
          icon={<Stamp className="w-8 h-8 text-foreground" weight='regular' />}
          isOpen={openSections.stamps}
          onToggle={() => toggleSection('stamps')}
          badge={stampsBadge}
        >
          <StampsForm />
        </CollapsibleSection>

        {/* Content Section */}
        <CollapsibleSection
          title={t('content')}
          subtitle={t('contentSubtitle')}
          icon={<TextT className="w-8 h-8 text-foreground" weight='regular' />}
          isOpen={openSections.content}
          onToggle={() => toggleSection('content')}
          badge={contentBadge}
        >
          <ContentForm />
        </CollapsibleSection>

        {/* Back Section */}
        <CollapsibleSection
          title={t('backSection')}
          subtitle={t('backSectionSubtitle')}
          icon={<ArrowUDownLeft className="w-8 h-8 text-foreground" weight='regular' />}
          isOpen={openSections.back}
          onToggle={() => toggleSection('back')}
          badge={backBadge}
        >
          <BackForm />
        </CollapsibleSection>

        {/* Messages */}
        {error === '__generating__' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
            {t('stripsGenerating')}
          </div>
        )}
        {error && error !== '__generating__' && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Compact: Activate button at bottom of form */}
        {design && !isActive && isCompact && (
          <div className="pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleActivate}
              disabled={saving}
            >
              {t('activateDesign')}
            </Button>
          </div>
        )}
      </div>
      </DesignFormProvider>
    );

    return (
      <div className="relative">
        {/* Header row — always full-width above both columns */}
        {(headerLeft || headerRight) && (
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="md:hidden -ml-1 shrink-0" />
              {headerLeft}
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs text-muted-foreground transition-opacity duration-300 ${draftStatus === 'saved' ? 'opacity-100' : 'opacity-0'
                  }`}
              >
                {t('draftSaved')}
              </span>
              {headerRight}
            </div>
          </div>
        )}

        {isCompact ? (
          <div>
            {mobileShowPreview ? previewPanel : formPanel}
          </div>
        ) : (
          <div className="flex flex-row gap-4 items-start">
            {/* Left column: form flows naturally, parent handles scroll */}
            <div className="flex-1 min-w-0 pb-12">
              {formPanel}
            </div>
            {/* Right column: sticky preview pinned to right edge */}
            <div className="w-[380px] flex-shrink-0 sticky top-6">
              {previewPanel}
            </div>
          </div>
        )}

        {/* Compact/mobile: floating toggle button */}
        {isCompact && (
          <Button
            size="icon"
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
            onClick={() => setMobileShowPreview(!mobileShowPreview)}
          >
            {mobileShowPreview ? (
              <SlidersHorizontal className="w-5 h-5" weight="bold" />
            ) : (
              <Eye className="w-5 h-5" weight="bold" />
            )}
          </Button>
        )}
      </div>
    );
  });


export default DesignEditorV2;
