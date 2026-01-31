'use client';

import { useState, useImperativeHandle, forwardRef, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CardDesign, CardDesignCreate } from '@/types';
import { createDesign, updateDesign, uploadLogo, uploadStripBackground, activateDesign } from '@/api';
import { useBusiness } from '@/contexts/business-context';
import CardPreview3D from './CardPreview3D';
import CardPreviewBack from './CardPreviewBack';
import ImageUploader from './ImageUploader';
import FieldEditor from './FieldEditor';
import { StampIconPicker, RewardIconPicker, StampIconType } from './StampIconPicker';
import { LabelWithTooltip } from './FieldTooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowsClockwise, FlipHorizontal, Check, Palette, Plus, Minus } from '@phosphor-icons/react';

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
  onNameChange?: (name: string) => void;
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
  secondary_fields: [{ key: 'reward', label: 'REWARD', value: 'Free item at 10 stamps!' }],
  auxiliary_fields: [],
  back_fields: [
    { key: 'terms', label: 'Terms & Conditions', value: 'Earn 1 stamp per purchase. Stamps expire after 1 year.' },
  ],
};

// Color presets matching onboarding
const backgroundColors = [
  { name: "Dark", value: "#1c1c1e" },
  { name: "Black", value: "#000000" },
  { name: "Navy", value: "#1a237e" },
  { name: "Wine", value: "#4a1c40" },
  { name: "Slate", value: "#37474f" },
  { name: "Cream", value: "#f5f0e8" },
  { name: "White", value: "#ffffff" },
];

const accentColors = [
  { name: "Orange", value: "#f97316" },
  { name: "Coral", value: "#e57373" },
  { name: "Red", value: "#f44336" },
  { name: "Teal", value: "#26a69a" },
  { name: "Purple", value: "#7e57c2" },
  { name: "Blue", value: "#42a5f5" },
  { name: "Green", value: "#4caf50" },
];

const iconColors = [
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#000000" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Cyan", value: "#06b6d4" },
];

const textColors = [
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#000000" },
  { name: "Dark Gray", value: "#374151" },
  { name: "Light Gray", value: "#d1d5db" },
];

const emptyStampColors = [
  { name: "White", value: "#ffffff" },
  { name: "Light Gray", value: "#e5e7eb" },
  { name: "Gray", value: "#9ca3af" },
  { name: "Dark", value: "#374151" },
  { name: "Transparent", value: "#00000000" },
];

// Convert rgb to hex
function rgbToHex(rgb: string): string {
  if (!rgb) return '#1c1c1e';
  if (rgb.startsWith('#')) return rgb;
  const match = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (!match) return '#1c1c1e';
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Convert hex to rgb
function hexToRgb(hex: string): string {
  if (!hex) return 'rgb(28, 28, 30)';
  if (hex.startsWith('rgb')) return hex;
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

const DesignEditorV2 = forwardRef<DesignEditorRef, DesignEditorV2Props>(
  function DesignEditorV2({ design, isNew = false, onSave, onSavingChange, designName, onNameChange }, ref) {
    const router = useRouter();
    const { currentBusiness } = useBusiness();
    const [formData, setFormData] = useState<CardDesignCreate & { logo_url?: string; strip_background_url?: string }>(
      design ? { ...design } : { ...DEFAULT_DESIGN }
    );
    const [isActive, setIsActive] = useState(design?.is_active ?? false);
    const [previewStamps, setPreviewStamps] = useState(3);
    const [showBack, setShowBack] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Use ref to always have access to latest form data for save
    const formDataRef = useRef(formData);
    formDataRef.current = formData;

    const handleSave = useCallback(async () => {
      if (!currentBusiness?.id) return;
      const data = formDataRef.current;
      if (!data.name || !data.organization_name || !data.description) {
        setError('Please fill in all required fields (Name, Organization, Description)');
        return;
      }

      setSaving(true);
      onSavingChange?.(true);
      setError(null);

      try {
        if (isNew) {
          const created = await createDesign(currentBusiness.id, data);
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
    }, [currentBusiness?.id, isNew, design, router, onSave, onSavingChange]);

    // Expose save function to parent
    useImperativeHandle(ref, () => ({
      handleSave,
      saving,
    }), [handleSave, saving]);

    // Collapsed sections state (4 sections)
    const [openSections, setOpenSections] = useState({
      branding: true,
      stamps: true,
      content: false,
      back: false,
    });

    // Sync design name from page header to formData
    useEffect(() => {
      if (designName !== undefined && designName !== formData.name) {
        updateField('name', designName);
      }
    }, [designName]);

    // Auto-fill organization name from business context for new designs
    useEffect(() => {
      if (isNew && currentBusiness?.name && !formData.organization_name) {
        updateField('organization_name', currentBusiness.name);
      }
    }, [currentBusiness?.name, isNew]);

    const toggleSection = (section: keyof typeof openSections) => {
      setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const updateField = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    };

    // Update color field (converts hex to rgb for storage)
    const updateColorField = (key: 'background_color' | 'stamp_filled_color' | 'label_color' | 'foreground_color' | 'stamp_empty_color' | 'stamp_border_color', hexValue: string) => {
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
        throw new Error('Please save the design first before uploading images');
      }
      const result = await uploadLogo(currentBusiness.id, design.id, file);
      updateField('logo_url', result.url);
    };

    const handleStripBackgroundUpload = async (file: File) => {
      if (!design || !currentBusiness?.id) {
        throw new Error('Please save the design first before uploading images');
      }
      const result = await uploadStripBackground(currentBusiness.id, design.id, file);
      updateField('strip_background_url', result.url);
    };

    // Get current colors as hex for pickers
    const bgHex = rgbToHex(formData.background_color || 'rgb(28, 28, 30)');
    const accentHex = rgbToHex(formData.stamp_filled_color || 'rgb(249, 115, 22)');
    const iconHex = rgbToHex(formData.label_color || 'rgb(255, 255, 255)');
    const textHex = rgbToHex(formData.foreground_color || 'rgb(255, 255, 255)');
    const emptyStampHex = rgbToHex(formData.stamp_empty_color || 'rgb(255, 255, 255)');

    // Check if current colors are custom
    const isCustomBackground = !backgroundColors.some(c => c.value.toLowerCase() === bgHex.toLowerCase());
    const isCustomAccent = !accentColors.some(c => c.value.toLowerCase() === accentHex.toLowerCase());
    const isCustomIcon = !iconColors.some(c => c.value.toLowerCase() === iconHex.toLowerCase());
    const isCustomText = !textColors.some(c => c.value.toLowerCase() === textHex.toLowerCase());
    const isCustomEmptyStamp = !emptyStampColors.some(c => c.value.toLowerCase() === emptyStampHex.toLowerCase());

    return (
      <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-200px)]">
        {/* Left: Scrollable Form */}
        <div className="lg:w-[420px] flex-shrink-0 overflow-y-auto pb-6 space-y-4">
          {/* Branding Section - Org Name, Description, Logo, Colors */}
          <CollapsibleSection
            title="Branding"
            isOpen={openSections.branding}
            onToggle={() => toggleSection('branding')}
          >
            <div className="space-y-5">
              {/* Organization Name */}
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="organization_name" tooltip="Your business name - shown at the top of the pass">Organization Name *</LabelWithTooltip>
                <Input
                  id="organization_name"
                  placeholder="e.g., Coffee Shop"
                  value={formData.organization_name}
                  onChange={(e) => updateField('organization_name', e.target.value)}
                />
              </div>

              {/* Card Description */}
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="description" tooltip="Subtitle shown below your business name">Card Description *</LabelWithTooltip>
                <Input
                  id="description"
                  placeholder="e.g., Loyalty Card"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>

              {/* Logo Upload */}
              <ImageUploader
                label="Logo"
                value={formData.logo_url}
                onUpload={handleLogoUpload}
                hint="Appears in top-left of pass. PNG, 160x50pt max"
              />

              {/* Background Color */}
              <div className="space-y-2">
                <LabelWithTooltip tooltip="Main background of your wallet pass">Background Color</LabelWithTooltip>
                <div className="grid grid-cols-8 gap-2">
                  {backgroundColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => updateColorField('background_color', color.value)}
                      className={`
                      w-10 h-10 rounded-lg transition-all duration-200
                      hover:scale-110 focus:outline-none
                      ${bgHex.toLowerCase() === color.value.toLowerCase()
                          ? "ring-2 ring-primary ring-offset-2"
                          : "ring-1 ring-black/10"
                        }
                    `}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                  <div
                    className={`w-10 h-10 rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-center bg-white relative ${isCustomBackground ? "ring-2 ring-primary ring-offset-2" : "ring-1 ring-black/20"
                      }`}
                    title="Custom color"
                  >
                    <input
                      type="color"
                      value={bgHex}
                      onChange={(e) => updateColorField('background_color', e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <Palette className="w-4 h-4 text-muted-foreground pointer-events-none" weight="bold" />
                  </div>
                </div>
              </div>

              {/* Text Color */}
              <div className="space-y-2">
                <LabelWithTooltip tooltip="Color for stamps count and main text on the pass">Text Color</LabelWithTooltip>
                <div className="grid grid-cols-8 gap-2">
                  {textColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => updateColorField('foreground_color', color.value)}
                      className={`
                      w-10 h-10 rounded-lg transition-all duration-200
                      hover:scale-110 focus:outline-none
                      ${textHex.toLowerCase() === color.value.toLowerCase()
                          ? "ring-2 ring-primary ring-offset-2"
                          : "ring-1 ring-black/10"
                        }
                    `}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                  <div
                    className={`w-10 h-10 rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-center bg-white relative ${isCustomText ? "ring-2 ring-primary ring-offset-2" : "ring-1 ring-black/20"
                      }`}
                    title="Custom color"
                  >
                    <input
                      type="color"
                      value={textHex}
                      onChange={(e) => updateColorField('foreground_color', e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <Palette className="w-4 h-4 text-muted-foreground pointer-events-none" weight="bold" />
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Stamps Section - Total, Icons, Colors, Background */}
          <CollapsibleSection
            title="Stamps"
            isOpen={openSections.stamps}
            onToggle={() => toggleSection('stamps')}
          >
            <div className="space-y-4">
              {/* Total Stamps with full-width +/- buttons */}
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

              {/* Stamp Icon */}
              <div className="space-y-2">
                <LabelWithTooltip tooltip="Icon shown inside each filled stamp">Stamp Icon</LabelWithTooltip>
                <StampIconPicker
                  value={(formData.stamp_icon || 'checkmark') as StampIconType}
                  onChange={(icon) => updateField('stamp_icon', icon)}
                  accentColor={accentHex}
                />
              </div>

              {/* Reward Icon */}
              <div className="space-y-2">
                <LabelWithTooltip tooltip="Special icon for the final stamp (the reward)">Reward Icon</LabelWithTooltip>
                <RewardIconPicker
                  value={(formData.reward_icon || 'gift') as StampIconType}
                  onChange={(icon) => updateField('reward_icon', icon)}
                  accentColor={accentHex}
                />
              </div>

              {/* Stamp Color */}
              <div className="space-y-2">
                <LabelWithTooltip tooltip="Color for filled stamp circles">Stamp Color</LabelWithTooltip>
                <div className="grid grid-cols-8 gap-2">
                  {accentColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => updateColorField('stamp_filled_color', color.value)}
                      className={`
                      w-10 h-10 rounded-lg transition-all duration-200
                      hover:scale-110 focus:outline-none
                      ${accentHex.toLowerCase() === color.value.toLowerCase()
                          ? "ring-2 ring-primary ring-offset-2"
                          : "ring-1 ring-black/10"
                        }
                    `}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                  <div
                    className={`w-10 h-10 rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-center bg-white relative ${isCustomAccent ? "ring-2 ring-primary ring-offset-2" : "ring-1 ring-black/20"
                      }`}
                    title="Custom color"
                  >
                    <input
                      type="color"
                      value={accentHex}
                      onChange={(e) => updateColorField('stamp_filled_color', e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <Palette className="w-4 h-4 text-muted-foreground pointer-events-none" weight="bold" />
                  </div>
                </div>
              </div>

              {/* Icon Color */}
              <div className="space-y-2">
                <LabelWithTooltip tooltip="Color for icons inside filled stamps">Icon Color</LabelWithTooltip>
                <div className="grid grid-cols-8 gap-2">
                  {iconColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => updateColorField('label_color', color.value)}
                      className={`
                      w-10 h-10 rounded-lg transition-all duration-200
                      hover:scale-110 focus:outline-none
                      ${iconHex.toLowerCase() === color.value.toLowerCase()
                          ? "ring-2 ring-primary ring-offset-2"
                          : "ring-1 ring-black/10"
                        }
                    `}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                  <div
                    className={`w-10 h-10 rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-center bg-white relative ${isCustomIcon ? "ring-2 ring-primary ring-offset-2" : "ring-1 ring-black/20"
                      }`}
                    title="Custom color"
                  >
                    <input
                      type="color"
                      value={iconHex}
                      onChange={(e) => updateColorField('label_color', e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <Palette className="w-4 h-4 text-muted-foreground pointer-events-none" weight="bold" />
                  </div>
                </div>
              </div>

              {/* Empty Stamp Color */}
              <div className="space-y-2">
                <LabelWithTooltip tooltip="Color for empty stamp circles (unfilled stamps)">Empty Stamp Color</LabelWithTooltip>
                <div className="grid grid-cols-8 gap-2">
                  {emptyStampColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => updateColorField('stamp_empty_color', color.value)}
                      className={`
                      w-10 h-10 rounded-lg transition-all duration-200
                      hover:scale-110 focus:outline-none
                      ${emptyStampHex.toLowerCase() === color.value.toLowerCase()
                          ? "ring-2 ring-primary ring-offset-2"
                          : "ring-1 ring-black/10"
                        }
                    `}
                      style={{ backgroundColor: color.value === '#00000000' ? 'transparent' : color.value }}
                      title={color.name}
                    />
                  ))}
                  <div
                    className={`w-10 h-10 rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-center bg-white relative ${isCustomEmptyStamp ? "ring-2 ring-primary ring-offset-2" : "ring-1 ring-black/20"
                      }`}
                    title="Custom color"
                  >
                    <input
                      type="color"
                      value={emptyStampHex}
                      onChange={(e) => updateColorField('stamp_empty_color', e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <Palette className="w-4 h-4 text-muted-foreground pointer-events-none" weight="bold" />
                  </div>
                </div>
              </div>

              {/* Strip Background */}
              <div className="space-y-2 pt-2 border-t">
                <LabelWithTooltip tooltip="Optional pattern or texture displayed behind the stamps">Strip Background</LabelWithTooltip>
                <ImageUploader
                  label=""
                  value={formData.strip_background_url}
                  onUpload={handleStripBackgroundUpload}
                  hint="Pattern behind stamps. 1125x432px recommended"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Content Section - Pass Fields */}
          <CollapsibleSection
            title="Content"
            isOpen={openSections.content}
            onToggle={() => toggleSection('content')}
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Fields displayed on the front of the pass below the stamps.
              </p>
              <FieldEditor
                title="Secondary Fields"
                fields={formData.secondary_fields || []}
                onChange={(f) => updateField('secondary_fields', f)}
                maxFields={3}
              />
              <FieldEditor
                title="Auxiliary Fields"
                fields={formData.auxiliary_fields || []}
                onChange={(f) => updateField('auxiliary_fields', f)}
                maxFields={3}
              />
            </div>
          </CollapsibleSection>

          {/* Back Section - Back Fields */}
          <CollapsibleSection
            title="Back"
            isOpen={openSections.back}
            onToggle={() => toggleSection('back')}
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Information shown when the customer taps the pass. Use this for terms, contact info, or instructions.
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

          {/* Mobile: Activate button at bottom of form */}
          {design && !isActive && (
            <div className="lg:hidden pt-4">
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

        {/* Right: Sticky Preview */}
        <div className="flex-1 lg:sticky lg:top-6 lg:self-start flex flex-col items-center justify-center min-h-[500px]">
          {/* Flip Toggle */}
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBack(!showBack)}
            >
              <FlipHorizontal className="w-4 h-4 mr-2" />
              {showBack ? 'Show Front' : 'Show Back'}
            </Button>
          </div>

          {/* Card Preview */}
          <div className="w-full max-w-sm">
            {showBack ? (
              <CardPreviewBack
                design={formData}
                organizationName={formData.organization_name}
              />
            ) : (
              <CardPreview3D
                design={formData}
                stamps={previewStamps}
                organizationName={formData.organization_name}
              />
            )}
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
                className="w-full accent-primary"
                min={0}
                max={formData.total_stamps || 10}
                value={previewStamps}
                onChange={(e) => setPreviewStamps(parseInt(e.target.value))}
              />
            </div>
          )}

          {/* Desktop: Action buttons below preview */}
          <div className="hidden lg:flex flex-col gap-3 mt-8 w-full max-w-sm">
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
      </div>
    );
  });

export default DesignEditorV2;

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, isOpen, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors"
      >
        <span className="font-medium">{title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="p-4 border-t">{children}</div>}
    </div>
  );
}
