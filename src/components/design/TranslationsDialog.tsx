'use client';

import { useState } from 'react';
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
import { cn } from '@/lib/utils';
import type { CardDesign, CardDesignUpdate, DesignTranslation, PassField } from '@/types';

const LOCALE_NAMES: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
};

const LOCALE_FLAGS: Record<string, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
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
  /** Every supported locale other than the primary. The dialog edits one at a
   *  time via a tab switcher and saves all of them together. */
  targetLocales: string[];
  onSave: (update: CardDesignUpdate) => void;
}

const EMPTY_TRANSLATION: DesignTranslation = {};

export default function TranslationsDialog({
  open,
  onOpenChange,
  design,
  translations,
  primaryLocale,
  targetLocales,
  onSave,
}: TranslationsDialogProps) {
  const t = useTranslations('designEditor.translations');

  // One translation draft per target locale, keyed by locale code.
  const [drafts, setDrafts] = useState<Record<string, DesignTranslation>>({});
  const [activeTarget, setActiveTarget] = useState<string>(targetLocales[0] ?? '');
  // Draft for the primary-language side (shared across all target locales)
  const [primary, setPrimary] = useState<PrimaryDraft>({
    organization_name: '',
    description: '',
    logo_text: '',
    secondary_fields: [],
    auxiliary_fields: [],
    back_fields: [],
  });

  // Re-initialize drafts when dialog opens (adjust state during render)
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    const initial: Record<string, DesignTranslation> = {};
    for (const loc of targetLocales) {
      initial[loc] = translations[loc] || {};
    }
    setDrafts(initial);
    setActiveTarget(targetLocales[0] ?? '');
    setPrimary({
      organization_name: design.organization_name,
      description: design.description,
      logo_text: design.logo_text || design.organization_name,
      secondary_fields: design.secondary_fields.map((f) => ({ ...f })),
      auxiliary_fields: design.auxiliary_fields.map((f) => ({ ...f })),
      back_fields: design.back_fields.map((f) => ({ ...f })),
    });
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  const draft = drafts[activeTarget] || EMPTY_TRANSLATION;

  // --- Translation draft helpers (operate on the active target locale) ---

  const updateDraft = (key: keyof DesignTranslation, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [activeTarget]: { ...(prev[activeTarget] || {}), [key]: value || undefined },
    }));
  };

  const updateFieldTranslation = (
    arrayKey: 'secondary_fields' | 'auxiliary_fields' | 'back_fields',
    fieldKey: string,
    prop: 'label' | 'value',
    text: string,
  ) => {
    setDrafts((prev) => {
      const current = prev[activeTarget] || {};
      const existing = current[arrayKey] || [];
      const idx = existing.findIndex((f) => f.key === fieldKey);
      const updated = [...existing];
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], [prop]: text };
      } else {
        updated.push({ key: fieldKey, label: '', value: '', [prop]: text });
      }
      const cleaned = updated.filter((f) => f.label || f.value);
      return {
        ...prev,
        [activeTarget]: { ...current, [arrayKey]: cleaned.length ? cleaned : undefined },
      };
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

  const cleanTranslation = (d: DesignTranslation): DesignTranslation => {
    const cleaned: DesignTranslation = {};
    if (d.organization_name) cleaned.organization_name = d.organization_name;
    if (d.description) cleaned.description = d.description;
    if (d.logo_text) cleaned.logo_text = d.logo_text;
    if (d.secondary_fields?.length) cleaned.secondary_fields = d.secondary_fields;
    if (d.auxiliary_fields?.length) cleaned.auxiliary_fields = d.auxiliary_fields;
    if (d.back_fields?.length) cleaned.back_fields = d.back_fields;
    return cleaned;
  };

  const handleSave = () => {
    const updatedTranslations = { ...translations };
    // Merge every target locale's draft (set when it has content, drop otherwise).
    for (const loc of targetLocales) {
      const cleaned = cleanTranslation(drafts[loc] || {});
      if (Object.keys(cleaned).length > 0) {
        updatedTranslations[loc] = cleaned;
      } else {
        delete updatedTranslations[loc];
      }
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
  const targetFlag = LOCALE_FLAGS[activeTarget] || '';
  const targetName = LOCALE_NAMES[activeTarget] || activeTarget;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] xs:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('title', { language: targetName })}
          </DialogTitle>
          {/* Locale switcher — one tab per non-primary locale. */}
          {targetLocales.length > 1 && (
            <div className="flex gap-2 mt-1">
              {targetLocales.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setActiveTarget(loc)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
                    loc === activeTarget
                      ? 'border-[var(--foreground)]/20 bg-[var(--foreground)]/[0.06] font-medium'
                      : 'border-border text-muted-foreground hover:bg-[var(--foreground)]/[0.03]',
                  )}
                >
                  <span className="text-base">{LOCALE_FLAGS[loc] || ''}</span>
                  <span>{LOCALE_NAMES[loc] || loc}</span>
                </button>
              ))}
            </div>
          )}
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
