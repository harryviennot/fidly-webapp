'use client';

import { useState, useImperativeHandle, forwardRef, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { CardDesign, CardDesignCreate } from '@/types';
import { createDesign, updateDesign, uploadLogo, uploadStripBackground, activateDesign } from '@/api';
import { useBusiness } from '@/contexts/business-context';
import { EditorCard } from '@/components/card';
import { GoogleWalletCard } from '@/components/card/GoogleWalletCard';
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
import { ArrowsClockwise, FlipHorizontal, Check, Minus, Plus, Eye, SlidersHorizontal, CaretDown } from '@phosphor-icons/react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  rgbToHex, hexToRgb, autoIconColor, contrastRatio,
  backgroundColors, accentColors, iconColors, textColors, emptyStampColors,
} from '@/lib/color-utils';

export interface DesignEditorRef {
  handleSave: () => Promise<void>;
  saving: boolean;
}

interface DesignEditorV2Props {
  design?: CardDesign;
  isNew?: boolean;
  onSave?: () => void;
  onSavingChange?: (saving: boolean) => void;
  designName?: string;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
}

const DEFAULT_DESIGN: CardDesignCreate = {
  name: '',
  organization_name: '',
  description: '',
  logo_text: '',
  foreground_color: 'rgb(255, 255, 255)',
  background_color: 'rgb(28, 28, 30)',
  label_color: 'rgb(255, 255, 255)',
  total_stamps: 10,
  stamp_filled_color: 'rgb(249, 115, 22)',
  stamp_empty_color: 'rgb(255, 255, 255)',
  stamp_border_color: 'rgb(255, 255, 255)',
  stamp_icon: 'checkmark',
  reward_icon: 'gift',
  icon_color: 'rgb(255, 255, 255)',
  secondary_fields: [{ key: 'reward', label: 'REWARD', value: 'Free item at 10 stamps!' }],
  auxiliary_fields: [],
  back_fields: [
    { key: 'terms', label: 'Terms & Conditions', value: 'Earn 1 stamp per purchase. Stamps expire after 1 year.' },
  ],
};

// Section completion heuristics
function isBrandingComplete(d: CardDesignCreate & { logo_url?: string }) {
  return !!(d.organization_name && d.description && d.background_color);
}

function isStampsComplete(d: CardDesignCreate) {
  return !!(d.stamp_filled_color && d.stamp_icon);
}

function isContentComplete(d: CardDesignCreate) {
  return (d.secondary_fields?.length ?? 0) > 0;
}

function isBackComplete(d: CardDesignCreate) {
  return (d.back_fields?.length ?? 0) > 0;
}

const DesignEditorV2 = forwardRef<DesignEditorRef, DesignEditorV2Props>(
  function DesignEditorV2({ design, isNew = false, onSave, onSavingChange, designName, headerLeft, headerRight }, ref) {
    const router = useRouter();
    const { currentBusiness } = useBusiness();
    const isMobile = useIsMobile();
    const isWideEnough = useMediaQuery('(min-width: 1280px)');
    const isCompact = !isWideEnough;
    const [formData, setFormData] = useState<CardDesignCreate>(
      design ? { ...design } : { ...DEFAULT_DESIGN }
    );
    const [isActive, setIsActive] = useState(design?.is_active ?? false);
    const [previewStamps, setPreviewStamps] = useState(3);
    const [showBack, setShowBack] = useState(false);
    const [previewWallet, setPreviewWallet] = useState<'apple' | 'google'>('apple');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [mobileShowPreview, setMobileShowPreview] = useState(false);
    const [showAdvancedStamps, setShowAdvancedStamps] = useState(false);
    const [iconColorOverridden, setIconColorOverridden] = useState(false);
    const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
    const [pendingStripFile, setPendingStripFile] = useState<File | null>(null);

    // Use ref to always have access to latest form data for save
    const formDataRef = useRef(formData);
    formDataRef.current = formData;

    const handleSave = useCallback(async () => {
      if (!currentBusiness?.id) return;
      const data = { ...formDataRef.current };
      if (!data.name || !data.organization_name || !data.description) {
        setError('Please fill in all required fields (Name, Organization, Description)');
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
          router.push(`/design/${created.id}`);
        } else if (design) {
          await updateDesign(currentBusiness.id, design.id, data);
          setSuccessMessage('Design saved successfully!');
          setTimeout(() => setSuccessMessage(null), 3000);
          onSave?.();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save design');
      } finally {
        setSaving(false);
        onSavingChange?.(false);
      }
    }, [currentBusiness?.id, isNew, design, router, onSave, onSavingChange, pendingLogoFile, pendingStripFile]);

    useImperativeHandle(ref, () => ({
      handleSave,
      saving,
    }), [handleSave, saving]);

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
      if (!confirm('Activate this design? All customers will receive the updated card.')) return;

      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      try {
        await activateDesign(currentBusiness.id, design.id);
        setIsActive(true);
        setSuccessMessage('Design activated! All customers have been notified.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to activate');
      } finally {
        setSaving(false);
      }
    };

    const handleLogoUpload = async (file: File) => {
      if (!design || !currentBusiness?.id) {
        // Deferred upload for new designs: store file and use blob URL for preview
        setPendingLogoFile(file);
        const blobUrl = URL.createObjectURL(file);
        updateField('logo_url', blobUrl);
        return;
      }
      const result = await uploadLogo(currentBusiness.id, design.id, file);
      updateField('logo_url', result.url);
    };

    const handleStripBackgroundUpload = async (file: File) => {
      if (!design || !currentBusiness?.id) {
        // Deferred upload for new designs
        setPendingStripFile(file);
        const blobUrl = URL.createObjectURL(file);
        updateField('strip_background_url', blobUrl);
        return;
      }
      const result = await uploadStripBackground(currentBusiness.id, design.id, file);
      updateField('strip_background_url', result.url);
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
        {/* Wallet Type Toggle + Flip Button */}
        <div className="mb-4 flex items-center gap-3">
          <Tabs value={previewWallet} onValueChange={(v) => setPreviewWallet(v as 'apple' | 'google')}>
            <TabsList>
              <TabsTrigger value="apple">Apple Wallet</TabsTrigger>
              <TabsTrigger value="google">Google Wallet</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBack(!showBack)}
          >
            <FlipHorizontal className="w-4 h-4 mr-2" />
            {showBack ? 'Front' : 'Back'}
          </Button>
        </div>

        {/* Card Preview with wallet switch animation — fixed height container */}
        <div className="w-full max-w-sm wallet-card-container aspect-[1/1.282]">
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
          <div className={`wallet-card h-full ${previewWallet === 'google' ? 'wallet-card-active' : 'wallet-card-right'}`}>
            <div className="card-flip-container h-full">
              <div className={`card-flip-inner h-full ${showBack ? 'flipped' : ''}`}>
                <div className="card-flip-front h-full overflow-y-auto hide-scrollbar">
                  <GoogleWalletCard
                    design={formData}
                    stamps={previewStamps}
                    organizationName={formData.organization_name}
                  />
                </div>
                <div className="card-flip-back">
                  <GoogleWalletCard
                    design={formData}
                    stamps={previewStamps}
                    organizationName={formData.organization_name}
                    showBack
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stamp Slider */}
        {!showBack && (
          <div className="w-full max-w-sm mt-6 px-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm text-muted-foreground">Preview Stamps</Label>
              <span className="text-sm font-medium">
                {previewStamps} / {formData.total_stamps || 10}
              </span>
            </div>
            <input
              type="range"
              className="styled-slider w-full"
              min={0}
              max={formData.total_stamps || 10}
              value={previewStamps}
              onChange={(e) => setPreviewStamps(parseInt(e.target.value))}
            />
          </div>
        )}

        {/* Desktop: Action buttons below preview */}
        <div className={`${isCompact ? 'hidden' : 'flex'} flex-col gap-3 mt-8 w-full max-w-sm`}>
          {design && !isActive && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleActivate}
              disabled={saving}
            >
              Activate Design
            </Button>
          )}

          {design && isActive && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleActivate}
              disabled={saving}
            >
              <ArrowsClockwise className="w-4 h-4 mr-2" />
              Update Customer Cards
            </Button>
          )}

          {isActive && (
            <p className="text-center text-sm text-muted-foreground">
              This design is currently active
            </p>
          )}
        </div>
      </div>
    );

    // ---- Form Panel ----
    const formPanel = (
      <div className="space-y-4">
        {/* Branding Section */}
        <CollapsibleSection
          title="Branding"
          isOpen={openSections.branding}
          onToggle={() => toggleSection('branding')}
          badge={brandingBadge}
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <LabelWithTooltip htmlFor="organization_name" tooltip="Your business name - shown at the top of the pass">Organization Name *</LabelWithTooltip>
              <Input
                id="organization_name"
                placeholder="e.g., Coffee Shop"
                value={formData.organization_name}
                onChange={(e) => updateField('organization_name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <LabelWithTooltip htmlFor="description" tooltip="On Apple Wallet, shown as the title on the info page. On Google Wallet, shown as the card header.">Card Description *</LabelWithTooltip>
              <Input
                id="description"
                placeholder="e.g., Loyalty Card"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>

            <ImageUploader
              label="Logo"
              value={formData.logo_url}
              onUpload={handleLogoUpload}
              hint="Appears in top-left of pass. PNG, 160x50pt max"
              enableCrop
            />

            <ColorPicker
              label="Background Color"
              tooltip="Main background of your wallet pass"
              colors={backgroundColors}
              value={bgHex}
              onChange={(hex) => updateColorField('background_color', hex)}
            />

            <ColorPicker
              label="Label Color"
              tooltip="Color for labels like 'STAMPS' and 'REWARD'. Apple Wallet only — Google Wallet uses its own text colors."
              colors={textColors}
              value={labelHex}
              onChange={(hex) => updateColorField('label_color', hex)}
              annotation="Apple Wallet only"
            />
            {labelContrast < 3 && (
              <p className="text-xs text-amber-600 -mt-1">Low contrast — labels may be hard to read on this background.</p>
            )}

            <ColorPicker
              label="Text Color"
              tooltip="Color for stamps count and main text. Apple Wallet only — Google Wallet uses its own text colors."
              colors={textColors}
              value={textHex}
              onChange={(hex) => updateColorField('foreground_color', hex)}
              annotation="Apple Wallet only"
            />
            {textContrast < 3 && (
              <p className="text-xs text-amber-600 -mt-1">Low contrast — text may be hard to read on this background.</p>
            )}
          </div>
        </CollapsibleSection>

        {/* Stamps Section */}
        <CollapsibleSection
          title="Stamps"
          isOpen={openSections.stamps}
          onToggle={() => toggleSection('stamps')}
          badge={stampsBadge}
        >
          <div className="space-y-4">
            {/* Basic controls — always visible */}
            <div className="space-y-2">
              <LabelWithTooltip tooltip="Stamps needed to earn the reward (2-20)">Total Stamps</LabelWithTooltip>
              <div className="flex items-center justify-between w-full">
                <button
                  type="button"
                  onClick={() => updateField('total_stamps', Math.max(2, (formData.total_stamps || 10) - 1))}
                  className="w-10 h-10 rounded-full border border-input flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={(formData.total_stamps || 10) <= 2}
                >
                  <Minus className="w-4 h-4" weight="bold" />
                </button>
                <span className="text-xl font-semibold">
                  {formData.total_stamps || 10}
                </span>
                <button
                  type="button"
                  onClick={() => updateField('total_stamps', Math.min(20, (formData.total_stamps || 10) + 1))}
                  className="w-10 h-10 rounded-full border border-input flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={(formData.total_stamps || 10) >= 20}
                >
                  <Plus className="w-4 h-4" weight="bold" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <LabelWithTooltip tooltip="Icon shown inside each filled stamp">Stamp Icon</LabelWithTooltip>
              <StampIconPicker
                value={(formData.stamp_icon || 'checkmark') as StampIconType}
                onChange={(icon) => updateField('stamp_icon', icon)}
                accentColor={accentHex}
              />
            </div>

            <div className="space-y-2">
              <LabelWithTooltip tooltip="Special icon for the final stamp (the reward)">Reward Icon</LabelWithTooltip>
              <RewardIconPicker
                value={(formData.reward_icon || 'gift') as StampIconType}
                onChange={(icon) => updateField('reward_icon', icon)}
                accentColor={accentHex}
              />
            </div>

            <ColorPicker
              label="Stamp Color"
              tooltip="Color for filled stamp circles"
              colors={accentColors}
              value={accentHex}
              onChange={(hex) => updateColorField('stamp_filled_color', hex)}
            />

            <ColorPicker
              label="Icon Color"
              tooltip="Color for icons inside filled stamps"
              colors={iconColors}
              value={iconHex}
              onChange={(hex) => {
                setIconColorOverridden(true);
                updateColorField('icon_color', hex);
              }}
            />

            {/* Advanced controls — collapsed by default */}
            <Collapsible open={showAdvancedStamps} onOpenChange={setShowAdvancedStamps}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
                >
                  <CaretDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvancedStamps ? 'rotate-180' : ''}`} weight="bold" />
                  Advanced options
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="collapsible-content px-2 -mx-2 pt-2">
                <div className="space-y-4 pt-2">
                  <ColorPicker
                    label="Empty Stamp Color"
                    tooltip="Color for empty stamp circles (unfilled stamps)"
                    colors={emptyStampColors}
                    value={emptyStampHex}
                    onChange={(hex) => updateColorField('stamp_empty_color', hex)}
                  />

                  <ColorPicker
                    label="Stamp Border Color"
                    tooltip="Border color for empty stamp circles"
                    colors={emptyStampColors}
                    value={borderColorHex}
                    onChange={(hex) => updateColorField('stamp_border_color', hex)}
                  />

                  <div className="space-y-2">
                    <LabelWithTooltip tooltip="Optional pattern or texture displayed behind the stamps">Strip Background</LabelWithTooltip>
                    <ImageUploader
                      label=""
                      value={formData.strip_background_url}
                      onUpload={handleStripBackgroundUpload}
                      hint="Pattern behind stamps. 1125x432px recommended"
                    />
                    {formData.strip_background_url && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Opacity</Label>
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
          title="Content"
          isOpen={openSections.content}
          onToggle={() => toggleSection('content')}
          badge={contentBadge}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              On Apple Wallet, these appear below the stamps. On Google Wallet, they appear above the QR code.
            </p>
            <FieldEditor
              title="Front Details"
              fields={formData.secondary_fields || []}
              onChange={(f) => updateField('secondary_fields', f)}
              maxFields={3}
            />
            <FieldEditor
              title="Additional Info"
              fields={formData.auxiliary_fields || []}
              onChange={(f) => updateField('auxiliary_fields', f)}
              maxFields={3}
            />
          </div>
        </CollapsibleSection>

        {/* Back Section */}
        <CollapsibleSection
          title="Back"
          isOpen={openSections.back}
          onToggle={() => toggleSection('back')}
          badge={backBadge}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Information shown when the customer taps the pass. On Apple Wallet, these appear on the back of the card. On Google Wallet, they appear in the details section.
            </p>
            <FieldEditor
              title="Back Fields"
              fields={formData.back_fields || []}
              onChange={(f) => updateField('back_fields', f)}
              maxFields={10}
            />
          </div>
        </CollapsibleSection>

        {/* Messages */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            {successMessage}
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
              Activate Design
            </Button>
          </div>
        )}
      </div>
    );

    return (
      <div className="relative -mt-6 -mb-6">
        {/* Compact/mobile: header row */}
        {isCompact && (
          <div className="flex items-center justify-between pt-6 mb-6 px-px">
            {headerLeft}
            {headerRight}
          </div>
        )}

        {isCompact ? (
          <div className="px-px">
            {mobileShowPreview ? previewPanel : formPanel}
          </div>
        ) : (
          <div className="flex flex-row gap-8 h-[calc(100dvh-64px)]">
            {/* Left column: title + form, scrolls internally */}
            <div className="w-[420px] flex-shrink-0 overflow-y-auto hide-scrollbar pt-6 pb-6">
              {headerLeft && <div className="mb-6">{headerLeft}</div>}
              {formPanel}
            </div>
            {/* Right column: save button + preview, fixed */}
            <div className="flex-1 flex flex-col items-center pt-6">
              {headerRight && <div className="self-end mb-4">{headerRight}</div>}
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
