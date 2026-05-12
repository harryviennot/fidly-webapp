'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { CaretDown } from '@phosphor-icons/react';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
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
 * Stamps section: stamp + reward icon, stamp color, icon color, plus an
 * advanced collapsible (empty-stamp color, border color, strip background).
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
    showAdvancedStamps,
    updateField,
    updateColorField,
    addCustomColor,
    setShowAdvancedStamps,
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
      />

      <Collapsible open={showAdvancedStamps} onOpenChange={setShowAdvancedStamps}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
          >
            <CaretDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvancedStamps ? 'rotate-180' : ''}`}
              weight="bold"
            />
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
                <div className="space-y-2 pt-2">
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
