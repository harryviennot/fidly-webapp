'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LabelWithTooltip } from '@/components/design/FieldTooltip';
import { ColorPicker } from '@/components/design/ColorPicker';
import { REWARD_ICON_IDS, type StampIconType } from '@/components/design/StampIconPicker';
import { IconPickerField } from '@/components/design/IconPickerField';
import ImageUploader from '@/components/design/ImageUploader';
import { accentColors, designColors, iconColors, emptyStampColors, rgbToHex, hexToRgb } from '@/lib/color-utils';
import { paletteToSwatches } from '@/lib/logo-palette';
import { boxFromMode, modeForBox, type StampStripBox } from '@/lib/stamp-strip';
import { cn } from '@/lib/utils';
import { useDesignForm } from './DesignFormContext';
import { CustomStampsPanel } from './CustomStampsPanel';

const STRIP_BOXES: StampStripBox[] = ['preset', 'custom', 'image_only'];

/**
 * Stamps section: a 3-box strip-style picker (classic preset icons / custom
 * uploaded icons / image only), the style's own controls, and the strip
 * background (color + optional image). Mirrors the points strip picker so
 * both card types read the same. "From your logo" preset rows are wired
 * into every color picker for consistency.
 */
export function StampsForm() {
  const t = useTranslations('designEditor.editor');
  const tCustom = useTranslations('designEditor.customStamps');
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
    palette,
  } = useDesignForm();

  // Local box state: the saved stamp_icon_mode only flips to 'custom' once
  // an icon is uploaded (a half-configured custom panel keeps the design
  // rendering presets), so the active box can't be derived from formData alone.
  const [box, setBox] = useState<StampStripBox>(boxFromMode(formData.stamp_icon_mode));

  const selectBox = (next: StampStripBox) => {
    setBox(next);
    const hasIcons = (formData.custom_stamp_config?.icons?.length ?? 0) > 0;
    // Config is retained when switching styles — re-entering the custom box
    // restores the previous uploads instantly.
    updateField('stamp_icon_mode', modeForBox(next, hasIcons));
  };

  // Wizard overrides with a per-business-type palette; dashboard falls back
  // to the universal `designColors` aliases below.
  const accentPalette = palette ?? accentColors;
  const iconPalette = palette ?? iconColors;
  const emptyPalette = palette ?? emptyStampColors;
  const stripBgPalette = palette ?? designColors;

  const logoPresets = useMemo(() => {
    return paletteToSwatches(extractedPalette).map((hex, i) => ({
      name: `${tAuto('fromLogo')} ${i + 1}`,
      value: hex,
    }));
  }, [extractedPalette, tAuto]);
  const logoPresetsLabel = logoPresets.length > 0 ? tAuto('fromLogo') : undefined;

  // Strip canvas color, shown for the stamp-drawing styles. Defaults to the
  // card's background_color (which is what the backend falls back to).
  const stripBgValue = formData.strip_background_color
    ? rgbToHex(formData.strip_background_color)
    : formData.background_color
      ? rgbToHex(formData.background_color)
      : '#1c1c1e';
  const hasStripImage = Boolean(formData.strip_background_url);

  return (
    <div className="space-y-5">
      {/* Strip style */}
      <div className="flex flex-col gap-3">
        <Label>{tCustom('styleLabel')}</Label>
        <div className="grid grid-cols-3 gap-2">
          {STRIP_BOXES.map((style) => {
            const active = box === style;
            return (
              <button
                key={style}
                type="button"
                onClick={() => selectBox(style)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-colors',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/50'
                )}
              >
                <StampStyleThumb style={style} />
                <span className="text-[11px] font-medium text-[#1A1A1A] text-center leading-tight">
                  {tCustom(`style_${style}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {box === 'custom' && <CustomStampsPanel />}

      {box === 'preset' && (
        <>
          <div className="flex flex-col gap-3">
            <LabelWithTooltip tooltip={t('stampIconTooltip')}>{t('stampIcon')}</LabelWithTooltip>
            <IconPickerField
              value={(formData.stamp_icon || 'checkmark') as StampIconType}
              onChange={(icon) => updateField('stamp_icon', icon)}
              accentColor={accentHex}
              iconColor={iconHex}
              label={t('stampIcon')}
            />
          </div>

          <div className="flex flex-col gap-3">
            <LabelWithTooltip tooltip={t('rewardIconTooltip')}>{t('rewardIcon')}</LabelWithTooltip>
            <IconPickerField
              value={(formData.reward_icon || 'gift') as StampIconType}
              onChange={(icon) => updateField('reward_icon', icon)}
              accentColor={accentHex}
              iconColor={iconHex}
              suggested={REWARD_ICON_IDS}
              label={t('rewardIcon')}
            />
          </div>

          <ColorPicker
            label={t('stampColor')}
            tooltip={t('stampColorTooltip')}
            colors={accentPalette}
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
            colors={iconPalette}
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
            colors={emptyPalette}
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
            palette={emptyPalette}
            onChange={(hex) => updateColorField('stamp_border_color', hex)}
            onCustomColor={addCustomColor}
          />
        </>
      )}

      {/* Strip background: the solid canvas color is editable for the
          stamp-drawing styles (it shows through wherever the image is absent
          or transparent). image_only hides the color — the image is the
          whole strip. */}
      {box !== 'image_only' && (
        <ColorPicker
          label={tCustom('bgColorLabel')}
          tooltip={tCustom('bgColorHelp')}
          colors={stripBgPalette}
          value={stripBgValue}
          onChange={(hex) => updateField('strip_background_color', hexToRgb(hex))}
          customColors={customColors}
          onCustomColor={addCustomColor}
          extraPresets={logoPresets}
          extraPresetsLabel={logoPresetsLabel}
        />
      )}

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
          enableCrop
          cropProps={{
            // Lock the crop to the strip's aspect so what the user frames is
            // exactly what the cover-fit renders — no surprise cropping.
            aspect: 1125 / 432,
            filename: 'strip-background.png',
          }}
        />
        {/* image_only lives or dies by its image — nudge if none uploaded. */}
        {box === 'image_only' && !hasStripImage && (
          <p className="text-[12px] text-[var(--accent)]">{tCustom('imageOnlyHint')}</p>
        )}
        {/* Opacity is meaningless for image_only (shown at full opacity). */}
        {hasStripImage && box !== 'image_only' && (
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

/** Tiny inline glyph representing each stamp strip style in the picker. */
function StampStyleThumb({ style }: { style: StampStripBox }) {
  if (style === 'custom') {
    // An uploaded-icon glyph — your own image inside the stamp slot.
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <circle cx="14" cy="14" r="11" fill="none" stroke="var(--accent)" strokeWidth="2" />
        <path
          d="M14 8.5l1.7 3.4 3.8.6-2.75 2.7.65 3.8L14 17.2 10.6 19l.65-3.8-2.75-2.7 3.8-.6z"
          fill="var(--accent)"
        />
      </svg>
    );
  }
  if (style === 'image_only') {
    // A little photo glyph — the strip is purely the uploaded image.
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <rect x="4" y="7" width="20" height="14" rx="2.5" fill="none" stroke="var(--accent)" strokeWidth="2" />
        <circle cx="10" cy="12" r="2" fill="var(--accent)" />
        <path d="M6 20l5-5 3.5 3.5L18 15l4 5z" fill="var(--accent)" />
      </svg>
    );
  }
  // Classic preset stamps — a row of filled/empty circles.
  return (
    <div className="flex items-center gap-1 h-7">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-3.5 h-3.5 rounded-full"
          style={{ background: i < 2 ? 'var(--accent)' : 'var(--border)' }}
        />
      ))}
    </div>
  );
}

interface StampBorderFieldProps {
  borderColorHex: string;
  emptyStampHex: string;
  customColors: string[];
  logoPresets: { name: string; value: string }[];
  logoPresetsLabel: string | undefined;
  palette: readonly { name: string; value: string }[];
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
  palette,
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
            colors={palette}
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
