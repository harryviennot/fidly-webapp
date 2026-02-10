'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CardDesign, CardDesignUpdate, DesignTranslation, PassField } from '@/types';

const LOCALE_NAMES: Record<string, string> = {
  fr: 'Français',
  en: 'English',
};

const LOCALE_FLAGS: Record<string, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
};

/** Primary-language fields that can be edited from this dialog. */
interface PrimaryDraft {
  organization_name: string;
  description: string;
  logo_text: string;
  secondary_fields: PassField[];
  auxiliary_fields: PassField[];
  back_fields: PassField[];
}

interface TranslationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  design: CardDesign;
  translations: Record<string, DesignTranslation>;
  primaryLocale: string;
  targetLocale: string;
  onSave: (update: CardDesignUpdate) => void;
}

export default function TranslationsDialog({
  open,
  onOpenChange,
  design,
  translations,
  primaryLocale,
  targetLocale,
  onSave,
}: TranslationsDialogProps) {
  const t = useTranslations('designEditor.translations');

  // Draft for the translation side
  const [draft, setDraft] = useState<DesignTranslation>({});
  // Draft for the primary-language side
  const [primary, setPrimary] = useState<PrimaryDraft>({
    organization_name: '',
    description: '',
    logo_text: '',
    secondary_fields: [],
    auxiliary_fields: [],
    back_fields: [],
  });

  // Initialize both drafts when dialog opens
  useEffect(() => {
    if (open) {
      setDraft(translations[targetLocale] || {});
      setPrimary({
        organization_name: design.organization_name,
        description: design.description,
        logo_text: design.logo_text || design.organization_name,
        secondary_fields: design.secondary_fields.map((f) => ({ ...f })),
        auxiliary_fields: design.auxiliary_fields.map((f) => ({ ...f })),
        back_fields: design.back_fields.map((f) => ({ ...f })),
      });
    }
  }, [open, translations, targetLocale, design]);

  // --- Translation draft helpers ---

  const updateDraft = (key: keyof DesignTranslation, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const updateFieldTranslation = (
    arrayKey: 'secondary_fields' | 'auxiliary_fields' | 'back_fields',
    fieldKey: string,
    prop: 'label' | 'value',
    text: string,
  ) => {
    setDraft((prev) => {
      const existing = prev[arrayKey] || [];
      const idx = existing.findIndex((f) => f.key === fieldKey);
      const updated = [...existing];
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], [prop]: text };
      } else {
        updated.push({ key: fieldKey, label: '', value: '', [prop]: text });
      }
      const cleaned = updated.filter((f) => f.label || f.value);
      return { ...prev, [arrayKey]: cleaned.length ? cleaned : undefined };
    });
  };

  const getFieldTranslation = (
    arrayKey: 'secondary_fields' | 'auxiliary_fields' | 'back_fields',
    fieldKey: string,
    prop: 'label' | 'value',
  ): string => {
    const fields = draft[arrayKey] || [];
    const field = fields.find((f) => f.key === fieldKey);
    return field ? (field[prop] || '') : '';
  };

  // --- Primary draft helpers ---

  const updatePrimary = (key: 'organization_name' | 'description' | 'logo_text', value: string) => {
    setPrimary((prev) => ({ ...prev, [key]: value }));
  };

  const updatePrimaryField = (
    arrayKey: 'secondary_fields' | 'auxiliary_fields' | 'back_fields',
    fieldKey: string,
    prop: 'label' | 'value',
    text: string,
  ) => {
    setPrimary((prev) => ({
      ...prev,
      [arrayKey]: prev[arrayKey].map((f) =>
        f.key === fieldKey ? { ...f, [prop]: text } : f,
      ),
    }));
  };

  // --- Save ---

  const handleSave = () => {
    // Build cleaned translations
    const cleaned: DesignTranslation = {};
    if (draft.organization_name) cleaned.organization_name = draft.organization_name;
    if (draft.description) cleaned.description = draft.description;
    if (draft.logo_text) cleaned.logo_text = draft.logo_text;
    if (draft.secondary_fields?.length) cleaned.secondary_fields = draft.secondary_fields;
    if (draft.auxiliary_fields?.length) cleaned.auxiliary_fields = draft.auxiliary_fields;
    if (draft.back_fields?.length) cleaned.back_fields = draft.back_fields;

    const updatedTranslations = { ...translations };
    if (Object.keys(cleaned).length > 0) {
      updatedTranslations[targetLocale] = cleaned;
    } else {
      delete updatedTranslations[targetLocale];
    }

    // Build the combined update: primary content + translations
    const update: CardDesignUpdate = {
      organization_name: primary.organization_name,
      description: primary.description,
      logo_text: primary.logo_text,
      secondary_fields: primary.secondary_fields,
      auxiliary_fields: primary.auxiliary_fields,
      back_fields: primary.back_fields,
      translations: updatedTranslations,
    };

    onSave(update);
    onOpenChange(false);
  };

  // --- Render helpers ---

  const renderFieldPair = (
    primaryValue: string,
    onPrimaryChange: (val: string) => void,
    translatedValue: string,
    onTranslatedChange: (val: string) => void,
  ) => (
    <div className="grid grid-cols-2 gap-6 items-start">
      <Input
        value={primaryValue}
        onChange={(e) => onPrimaryChange(e.target.value)}
      />
      <Input
        placeholder={t('sameAsPrimary')}
        value={translatedValue}
        onChange={(e) => onTranslatedChange(e.target.value)}
      />
    </div>
  );

  const renderFieldArraySection = (
    sectionLabel: string,
    primaryFields: PassField[],
    arrayKey: 'secondary_fields' | 'auxiliary_fields' | 'back_fields',
  ) => {
    if (!primaryFields?.length) return null;

    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">{sectionLabel}</Label>
        {primaryFields.map((field) => (
          <div key={field.key} className="space-y-2 pl-2">
            <div className="text-xs text-muted-foreground">{field.key}</div>
            {renderFieldPair(
              field.label,
              (val) => updatePrimaryField(arrayKey, field.key, 'label', val),
              getFieldTranslation(arrayKey, field.key, 'label'),
              (val) => updateFieldTranslation(arrayKey, field.key, 'label', val),
            )}
            {renderFieldPair(
              field.value,
              (val) => updatePrimaryField(arrayKey, field.key, 'value', val),
              getFieldTranslation(arrayKey, field.key, 'value'),
              (val) => updateFieldTranslation(arrayKey, field.key, 'value', val),
            )}
          </div>
        ))}
      </div>
    );
  };

  const primaryFlag = LOCALE_FLAGS[primaryLocale] || '';
  const primaryName = LOCALE_NAMES[primaryLocale] || primaryLocale;
  const targetFlag = LOCALE_FLAGS[targetLocale] || '';
  const targetName = LOCALE_NAMES[targetLocale] || targetLocale;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] xs:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('title', { language: targetName })}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="grid grid-cols-2 gap-6 mt-3 pb-2 border-b border-border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-base">{primaryFlag}</span>
                <span>{primaryName}</span>
                <span className="text-xs text-muted-foreground font-normal">({t('primaryContent')})</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-base">{targetFlag}</span>
                <span>{targetName}</span>
                <span className="text-xs text-muted-foreground font-normal">({t('translatedContent')})</span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Organization Name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t('organizationName')}</Label>
            {renderFieldPair(
              primary.organization_name,
              (val) => updatePrimary('organization_name', val),
              draft.organization_name || '',
              (val) => updateDraft('organization_name', val),
            )}
          </div>

          {/* Card Description */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t('cardDescription')}</Label>
            {renderFieldPair(
              primary.description,
              (val) => updatePrimary('description', val),
              draft.description || '',
              (val) => updateDraft('description', val),
            )}
          </div>

          {/* Logo Text */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t('logoText')}</Label>
            {renderFieldPair(
              primary.logo_text,
              (val) => updatePrimary('logo_text', val),
              draft.logo_text || '',
              (val) => updateDraft('logo_text', val),
            )}
          </div>

          {/* Secondary Fields */}
          {renderFieldArraySection(
            t('frontDetails'),
            primary.secondary_fields,
            'secondary_fields',
          )}

          {/* Auxiliary Fields */}
          {renderFieldArraySection(
            t('additionalInfo'),
            primary.auxiliary_fields,
            'auxiliary_fields',
          )}

          {/* Back Fields */}
          {renderFieldArraySection(
            t('backFields'),
            primary.back_fields,
            'back_fields',
          )}
        </div>

        <DialogFooter>
          <Button
            className="rounded-full"
            onClick={handleSave}
          >
            {t('saveTranslations')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
