'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { LabelWithTooltip } from '@/components/design/FieldTooltip';
import { ColorPicker } from '@/components/design/ColorPicker';
import { AutoGenerateBar } from '@/components/design/AutoGenerateBar';
import ImageUploader from '@/components/design/ImageUploader';
import { backgroundColors, textColors } from '@/lib/color-utils';
import { paletteToSwatches } from '@/lib/logo-palette';
import { useDesignForm } from './DesignFormContext';

/**
 * Branding section: auto-generate bar, organization name, card description,
 * logo, and the three color pickers (background, label, text). Used by both
 * `DesignEditorV2` and the wizard's Design chapter step 1.
 */
export function BrandingForm() {
  const t = useTranslations('designEditor.editor');
  const tAuto = useTranslations('designEditor.autoGenerate');
  const {
    formData,
    bgHex,
    labelHex,
    textHex,
    labelContrast,
    textContrast,
    customColors,
    updateField,
    updateColorField,
    addCustomColor,
    handleLogoUpload,
    handleLogoClear,
    extractedPalette,
  } = useDesignForm();

  // Convert the extracted palette into a "From your logo" row of preset
  // swatches surfaced inside each color picker. Memoised so identity is
  // stable across renders of unaffected siblings.
  const logoPresets = useMemo(() => {
    return paletteToSwatches(extractedPalette).map((hex, i) => ({
      name: `${tAuto('fromLogo')} ${i + 1}`,
      value: hex,
    }));
  }, [extractedPalette, tAuto]);
  const logoPresetsLabel = logoPresets.length > 0 ? tAuto('fromLogo') : undefined;

  return (
    <div className="space-y-5">
      <AutoGenerateBar />

      <div className="space-y-2">
        <LabelWithTooltip htmlFor="organization_name" tooltip={t('organizationTooltip')}>
          {t('organizationName')}
        </LabelWithTooltip>
        <Input
          id="organization_name"
          placeholder={t('organizationPlaceholder')}
          value={formData.organization_name}
          onChange={(e) => updateField('organization_name', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <LabelWithTooltip htmlFor="description" tooltip={t('cardDescriptionTooltip')}>
          {t('cardDescription')}
        </LabelWithTooltip>
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
        extraPresets={logoPresets}
        extraPresetsLabel={logoPresetsLabel}
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
        extraPresets={logoPresets}
        extraPresetsLabel={logoPresetsLabel}
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
        extraPresets={logoPresets}
        extraPresetsLabel={logoPresetsLabel}
      />
      {textContrast < 3 && (
        <p className="text-xs text-amber-600 -mt-1">{t('lowContrastText')}</p>
      )}
    </div>
  );
}
