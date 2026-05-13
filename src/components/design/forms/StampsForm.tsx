'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LabelWithTooltip } from '@/components/design/FieldTooltip';
import { ColorPicker } from '@/components/design/ColorPicker';
import {
  StampIconPicker,
  RewardIconPicker,
  type StampIconType,
} from '@/components/design/StampIconPicker';
import ImageUploader from '@/components/design/ImageUploader';
import { accentColors, iconColors, emptyStampColors } from '@/lib/color-utils';
import { paletteToSwatches } from '@/lib/logo-palette';
import { useDesignForm } from './DesignFormContext';

/**
 * Stamps section: stamp + reward icon, all stamp-related colors, and the
 * optional strip background. v3 dropped the "Advanced options" collapsible
 * — empty / border / strip controls are surfaced inline so users don't
 * miss them. "From your logo" preset rows are wired into every color
 * picker for consistency.
 */
export function StampsForm() {
  const t = useTranslations('designEditor.editor');
  const tAuto = useTranslations('designEditor.autoGenerate');
  const {
    formData,
    accentHex,
    iconHex,
    emptyStampHex,
    borderColorHex,
    customColors,
    updateField,
    updateColorField,
    addCustomColor,
    setIconColorOverridden,
    handleStripBackgroundUpload,
    handleStripBackgroundClear,
    extractedPalette,
  } = useDesignForm();

  const logoPresets = useMemo(() => {
    return paletteToSwatches(extractedPalette).map((hex, i) => ({
      name: `${tAuto('fromLogo')} ${i + 1}`,
      value: hex,
    }));
  }, [extractedPalette, tAuto]);
  const logoPresetsLabel = logoPresets.length > 0 ? tAuto('fromLogo') : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <LabelWithTooltip tooltip={t('stampIconTooltip')}>{t('stampIcon')}</LabelWithTooltip>
        <StampIconPicker
          value={(formData.stamp_icon || 'checkmark') as StampIconType}
          onChange={(icon) => updateField('stamp_icon', icon)}
          accentColor={accentHex}
          iconColor={iconHex}
        />
      </div>

      <div className="flex flex-col gap-3">
        <LabelWithTooltip tooltip={t('rewardIconTooltip')}>{t('rewardIcon')}</LabelWithTooltip>
        <RewardIconPicker
          value={(formData.reward_icon || 'gift') as StampIconType}
          onChange={(icon) => updateField('reward_icon', icon)}
          accentColor={accentHex}
          iconColor={iconHex}
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
        extraPresets={logoPresets}
        extraPresetsLabel={logoPresetsLabel}
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
        extraPresets={logoPresets}
        extraPresetsLabel={logoPresetsLabel}
      />

      <ColorPicker
        label={t('emptyStampColor')}
        tooltip={t('emptyStampTooltip')}
        colors={emptyStampColors}
        value={emptyStampHex}
        onChange={(hex) => updateColorField('stamp_empty_color', hex)}
        customColors={customColors}
        onCustomColor={addCustomColor}
        extraPresets={logoPresets}
        extraPresetsLabel={logoPresetsLabel}
      />

      <StampBorderField
        borderColorHex={borderColorHex}
        emptyStampHex={emptyStampHex}
        customColors={customColors}
        logoPresets={logoPresets}
        logoPresetsLabel={logoPresetsLabel}
        onChange={(hex) => updateColorField('stamp_border_color', hex)}
        onCustomColor={addCustomColor}
      />

      <div className="flex flex-col gap-3">
        <LabelWithTooltip tooltip={t('stripBackgroundTooltip')}>
          {t('stripBackground')}
        </LabelWithTooltip>
        <ImageUploader
          label=""
          value={formData.strip_background_url}
          onUpload={handleStripBackgroundUpload}
          onClear={handleStripBackgroundClear}
          hint={t('stripHint')}
        />
        {formData.strip_background_url && (
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('opacity')}</Label>
              <span className="text-sm text-muted-foreground">
                {formData.strip_background_opacity ?? 40}%
              </span>
            </div>
            <input
              type="range"
              className="styled-slider w-full"
              min={0}
              max={100}
              value={formData.strip_background_opacity ?? 40}
              onChange={(e) => updateField('strip_background_opacity', parseInt(e.target.value, 10))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface StampBorderFieldProps {
  borderColorHex: string;
  emptyStampHex: string;
  customColors: string[];
  logoPresets: { name: string; value: string }[];
  logoPresetsLabel: string | undefined;
  onChange: (hex: string) => void;
  onCustomColor: (hex: string) => void;
}

/**
 * Stamp-border control. The switch sits on the *same row* as the section
 * label so the field reads as one unit; flipping it off animates the color
 * picker away below. Frontend-only — the design row stores a border color
 * always; the "no border" state sets the border color equal to the empty-
 * stamp color so the stroke is visually invisible.
 *
 * Behaviour:
 *  - The switch is OFF when `borderColorHex === emptyStampHex` (auto-detected).
 *  - OFF → ON: set border to white. If empty is already white (which would
 *    immediately flip the switch back OFF in a loop), fall back to black.
 *  - ON → OFF: set border to the current empty-stamp color.
 *  - The color picker is hidden when OFF — collapsed via grid-rows trick
 *    so the transition is smooth.
 */
function StampBorderField({
  borderColorHex,
  emptyStampHex,
  customColors,
  logoPresets,
  logoPresetsLabel,
  onChange,
  onCustomColor,
}: StampBorderFieldProps) {
  const t = useTranslations('designEditor.editor');
  const enabled = borderColorHex.toLowerCase() !== emptyStampHex.toLowerCase();

  const toggle = (next: boolean) => {
    if (!next) {
      onChange(emptyStampHex);
      return;
    }
    const isEmptyWhite = emptyStampHex.toLowerCase() === '#ffffff';
    onChange(isEmptyWhite ? '#000000' : '#FFFFFF');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <LabelWithTooltip tooltip={t('stampBorderTooltip')}>
          {t('stampBorderColor')}
        </LabelWithTooltip>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>
      <div
        className={`grid transition-all duration-300 ease-out ${
          enabled ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        {/* `-mx-3 px-3` widens the overflow-hidden clip box on both sides so
            edge swatches' hover scale doesn't get cropped. The matching
            padding keeps the picker's effective width the same as the
            surrounding form column. */}
        <div className="overflow-hidden -mx-3 px-3">
          <ColorPicker
            label=""
            tooltip={t('stampBorderTooltip')}
            colors={emptyStampColors}
            value={borderColorHex}
            onChange={onChange}
            customColors={customColors}
            onCustomColor={onCustomColor}
            extraPresets={logoPresets}
            extraPresetsLabel={logoPresetsLabel}
          />
        </div>
      </div>
    </div>
  );
}
