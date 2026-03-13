'use client';

import { useState, useImperativeHandle, forwardRef, useRef, useCallback, useEffect, type ReactNode } from 'react';
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
import ImageUploader from './ImageUploader';
import FieldEditor from './FieldEditor';
import { StampIconPicker, RewardIconPicker, StampIconType } from './StampIconPicker';
import { LabelWithTooltip } from './FieldTooltip';
import { ColorPicker } from './ColorPicker';
import { CollapsibleSection } from './CollapsibleSection';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, SlidersHorizontal, CaretDown, GearSix, Palette, Stamp, TextT, ArrowUDownLeft, MapPin, Globe, Phone, Envelope, Clock, NotePencil, Check } from '@phosphor-icons/react';
import Link from 'next/link';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  rgbToHex, hexToRgb, autoIconColor, contrastRatio,
  backgroundColors, accentColors, iconColors, textColors, emptyStampColors,
} from '@/lib/color-utils';
import { getDesignDraft, useDesignDraftPersistence } from '@/hooks/use-design-draft';

export interface DesignEditorRef {
  handleSave: () => Promise<void>;
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
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
}

function getDefaultDesign(t: ReturnType<typeof useTranslations>, totalStamps: number): CardDesignCreate {
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
    secondary_fields: [{ key: 'reward', label: t('defaultRewardLabel'), value: t('defaultRewardValue', { count: totalStamps }) }],
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
  function DesignEditorV2({ design, isNew = false, onSave, onSavingChange, onDirtyChange, designName, programTotalStamps, programName, headerLeft, headerRight }, ref) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { currentBusiness } = useBusiness();
    const t = useTranslations('designEditor.editor');
    const isWideEnough = useMediaQuery('(min-width: 1280px)');
    const isCompact = !isWideEnough;
    const totalStamps = programTotalStamps ?? 10;

    const draftId = design?.id ?? 'new';
    const [formData, setFormData] = useState<CardDesignCreate>(() => {
      const defaultData = design ? { ...design } : getDefaultDesign(t, totalStamps);
      const draft = getDesignDraft(draftId);
      if (draft) {
        // Use draft if it's newer than the server data
        const serverTime = design?.updated_at ? new Date(design.updated_at).getTime() : 0;
        if (draft.lastModified > serverTime) {
          return { ...defaultData, ...draft.data };
        }
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

    const addCustomColor = useCallback((hex: string) => {
      setCustomColors((prev) => {
        if (prev.some((c) => c.toLowerCase() === hex.toLowerCase())) return prev;
        return [...prev, hex];
      });
    }, []);

    // Use ref to always have access to latest form data for save
    const formDataRef = useRef(formData);
    formDataRef.current = formData;

    // Draft persistence
    const { draftStatus, clearDraft } = useDesignDraftPersistence(draftId, formData, design?.updated_at);

    // Dirty state tracking
    const lastSavedDataRef = useRef(
      JSON.stringify(design ? { ...design } : getDefaultDesign(t, totalStamps))
    );
    const isDirty = JSON.stringify(formData) !== lastSavedDataRef.current;

    useEffect(() => {
      onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    const handleSave = useCallback(async () => {
      if (!currentBusiness?.id) return;
      const { translations, ...data } = formDataRef.current;
      void translations;
      if (!data.name || !data.description) {
        setError(t('requiredFields'));
        return;
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
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('failedToSave'));
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
                          design={formData}
                          previewStamps={previewStamps}
                          organizationName={formData.organization_name}
                          showBack={false}
                        />
                      </div>
                      <div className="card-flip-back">
                        <EditorCard
                          design={formData}
                          previewStamps={previewStamps}
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
                            design={formData}
                            stamps={previewStamps}
                            organizationName={formData.organization_name}
                          />
                        </ScaledCardWrapper>
                      </div>
                      <div className="card-flip-back">
                        <ScaledCardWrapper baseWidth={320} dynamicHeight>
                          <GoogleWalletCard
                            design={formData}
                            stamps={previewStamps}
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
          <div className="space-y-5">
            <div className="space-y-2">
              <LabelWithTooltip htmlFor="organization_name" tooltip={t('organizationTooltip')}>{t('organizationName')}</LabelWithTooltip>
              <Input
                id="organization_name"
                placeholder={t('organizationPlaceholder')}
                value={formData.organization_name}
                onChange={(e) => updateField('organization_name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <LabelWithTooltip htmlFor="description" tooltip={t('cardDescriptionTooltip')}>{t('cardDescription')}</LabelWithTooltip>
              <Input
                id="description"
                placeholder={t('cardDescriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>

            <ImageUploader
              label={t('logo')}
              value={formData.logo_url}
              onUpload={handleLogoUpload}
              onClear={handleLogoClear}
              hint={t('logoHint')}
              enableCrop
            />

            <ColorPicker
              label={t('backgroundColor')}
              tooltip={t('backgroundTooltip')}
              colors={backgroundColors}
              value={bgHex}
              onChange={(hex) => updateColorField('background_color', hex)}
              customColors={customColors}
              onCustomColor={addCustomColor}
            />

            <ColorPicker
              label={t('labelColor')}
              tooltip={t('labelTooltip')}
              colors={textColors}
              value={labelHex}
              onChange={(hex) => updateColorField('label_color', hex)}
              annotation={t('appleOnly')}
              customColors={customColors}
              onCustomColor={addCustomColor}
            />
            {labelContrast < 3 && (
              <p className="text-xs text-amber-600 -mt-1">{t('lowContrastLabel')}</p>
            )}

            <ColorPicker
              label={t('textColor')}
              tooltip={t('textTooltip')}
              colors={textColors}
              value={textHex}
              onChange={(hex) => updateColorField('foreground_color', hex)}
              annotation={t('appleOnly')}
              customColors={customColors}
              onCustomColor={addCustomColor}
            />
            {textContrast < 3 && (
              <p className="text-xs text-amber-600 -mt-1">{t('lowContrastText')}</p>
            )}
          </div>
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
          <div className="space-y-4">
            <div className="space-y-2">
              <LabelWithTooltip tooltip={t('stampIconTooltip')}>{t('stampIcon')}</LabelWithTooltip>
              <StampIconPicker
                value={(formData.stamp_icon || 'checkmark') as StampIconType}
                onChange={(icon) => updateField('stamp_icon', icon)}
                accentColor={accentHex}
              />
            </div>

            <div className="space-y-2">
              <LabelWithTooltip tooltip={t('rewardIconTooltip')}>{t('rewardIcon')}</LabelWithTooltip>
              <RewardIconPicker
                value={(formData.reward_icon || 'gift') as StampIconType}
                onChange={(icon) => updateField('reward_icon', icon)}
                accentColor={accentHex}
              />
            </div>

            <ColorPicker
              label={t('stampColor')}
              tooltip={t('stampColorTooltip')}
              colors={accentColors}
              value={accentHex}
              onChange={(hex) => updateColorField('stamp_filled_color', hex)}
              customColors={customColors}
              onCustomColor={addCustomColor}
            />

            <ColorPicker
              label={t('iconColor')}
              tooltip={t('iconColorTooltip')}
              colors={iconColors}
              value={iconHex}
              onChange={(hex) => {
                setIconColorOverridden(true);
                updateColorField('icon_color', hex);
              }}
              customColors={customColors}
              onCustomColor={addCustomColor}
            />

            {/* Advanced controls — collapsed by default */}
            <Collapsible open={showAdvancedStamps} onOpenChange={setShowAdvancedStamps}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
                >
                  <CaretDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvancedStamps ? 'rotate-180' : ''}`} weight="bold" />
                  {t('advancedOptions')}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="collapsible-content px-2 -mx-2 pt-2">
                <div className="space-y-4 pt-2">
                  <ColorPicker
                    label={t('emptyStampColor')}
                    tooltip={t('emptyStampTooltip')}
                    colors={emptyStampColors}
                    value={emptyStampHex}
                    onChange={(hex) => updateColorField('stamp_empty_color', hex)}
                    customColors={customColors}
                    onCustomColor={addCustomColor}
                  />

                  <ColorPicker
                    label={t('stampBorderColor')}
                    tooltip={t('stampBorderTooltip')}
                    colors={emptyStampColors}
                    value={borderColorHex}
                    onChange={(hex) => updateColorField('stamp_border_color', hex)}
                    customColors={customColors}
                    onCustomColor={addCustomColor}
                  />

                  <div className="space-y-2">
                    <LabelWithTooltip tooltip={t('stripBackgroundTooltip')}>{t('stripBackground')}</LabelWithTooltip>
                    <ImageUploader
                      label=""
                      value={formData.strip_background_url}
                      onUpload={handleStripBackgroundUpload}
                      onClear={() => {
                        updateField('strip_background_url', null as unknown as string);
                        setPendingStripFile(null);
                      }}
                      hint={t('stripHint')}
                    />
                    {formData.strip_background_url && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">{t('opacity')}</Label>
                          <span className="text-sm text-muted-foreground">{formData.strip_background_opacity ?? 40}%</span>
                        </div>
                        <input
                          type="range"
                          className="styled-slider w-full"
                          min={0}
                          max={100}
                          value={formData.strip_background_opacity ?? 40}
                          onChange={(e) => updateField('strip_background_opacity', parseInt(e.target.value))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
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
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('contentDescription')}
            </p>
            <FieldEditor
              title={t('frontDetails')}
              fields={formData.secondary_fields || []}
              onChange={(f) => updateField('secondary_fields', f)}
              maxFields={3}
            />
            <FieldEditor
              title={t('additionalInfo')}
              fields={formData.auxiliary_fields || []}
              onChange={(f) => updateField('auxiliary_fields', f)}
              maxFields={3}
            />
          </div>
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
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('backDescription')}
            </p>

            {/* Inherited business info fields */}
            <BusinessInfoFields
              businessInfo={(currentBusiness?.settings?.business_info as Array<{ type: string; key: string; data: Record<string, unknown> }>) || []}
              hiddenKeys={formData.hidden_business_info_keys || []}
              onToggleKey={(key) => {
                const current = formData.hidden_business_info_keys || [];
                const next = current.includes(key)
                  ? current.filter((k) => k !== key)
                  : [...current, key];
                updateField('hidden_business_info_keys', next);
              }}
            />

            <FieldEditor
              title={t('cardSpecific')}
              fields={formData.back_fields || []}
              onChange={(f) => updateField('back_fields', f)}
              maxFields={10}
            />
          </div>
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
    );

    return (
      <div className="relative">
        {/* Header row — always full-width above both columns */}
        {(headerLeft || headerRight) && (
          <div className="flex items-center justify-between mb-5">
            {headerLeft}
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

/** Type-specific icons for business info entries */
const TYPE_ICONS: Record<string, typeof Clock> = {
  hours: Clock,
  website: Globe,
  phone: Phone,
  email: Envelope,
  address: MapPin,
  custom: NotePencil,
};

/** Inline component: shows inherited business info with visibility toggles */
function BusinessInfoFields({
  businessInfo,
  hiddenKeys,
  onToggleKey,
}: {
  businessInfo: Array<{ type: string; key: string; data: Record<string, unknown> }>;
  hiddenKeys: string[];
  onToggleKey: (key: string) => void;
}) {
  const t = useTranslations('designEditor.editor');

  const TYPE_LABELS: Record<string, string> = {
    hours: 'Store Hours',
    website: 'Website',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    custom: 'Custom',
  };

  if (businessInfo.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 space-y-2">
        <p className="text-xs text-muted-foreground">{t('noBusinessInfo')}</p>
        <Link href="/settings" className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1">
          <GearSix className="w-3 h-3" />
          {t('goToSettings')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {businessInfo.map((entry) => {
        const isHidden = hiddenKeys.includes(entry.key);
        const preview = getEntryPreview(entry);
        const Icon = TYPE_ICONS[entry.type] || NotePencil;
        return (
          <button
            key={entry.key}
            type="button"
            onClick={() => onToggleKey(entry.key)}
            className={`flex items-center gap-3 w-full p-3 rounded-xl cursor-pointer transition-all text-left ${isHidden
              ? 'bg-muted/30 border border-border'
              : 'bg-[var(--accent-light)]/50 border border-[var(--accent)]/20'
              }`}
          >
            <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${isHidden ? 'bg-white border border-border' : 'bg-[var(--accent)]'
              }`}>
              {!isHidden && <Check className="w-3 h-3 text-white" weight="bold" />}
            </div>
            <Icon className={`w-4 h-4 flex-shrink-0 ${isHidden ? 'text-muted-foreground' : 'text-[var(--accent)]'}`} />
            <div className={`flex-1 min-w-0 ${isHidden ? 'opacity-40' : ''}`}>
              <span className="text-sm font-semibold">
                {entry.type === 'custom' ? ((entry.data.label as string) || TYPE_LABELS.custom) : (TYPE_LABELS[entry.type] || entry.type)}
              </span>
              {preview && (
                <p className="text-xs text-muted-foreground truncate">{preview}</p>
              )}
            </div>
          </button>
        );
      })}
      <p className="text-xs text-muted-foreground mt-3">
        {t('businessInfoExplanation')}{' '}
        <Link href="/settings" className="text-[var(--accent)] hover:underline inline-flex items-center gap-1">
          <GearSix className="w-3 h-3" />
          {t('goToSettings')}
        </Link>
      </p>
    </div>
  );
}

function getEntryPreview(entry: { type: string; data: Record<string, unknown> }): string {
  switch (entry.type) {
    case 'website': return (entry.data.url as string) || '';
    case 'phone': return (entry.data.number as string) || '';
    case 'email': return (entry.data.email as string) || '';
    case 'address': return (entry.data.address as string) || '';
    case 'hours': {
      const schedule = (entry.data.schedule as Array<{ days: string; closed?: boolean }>) || [];
      return schedule.map((s) => s.days).join(', ');
    }
    case 'custom': return (entry.data.value as string) || '';
    default: return '';
  }
}

export default DesignEditorV2;
