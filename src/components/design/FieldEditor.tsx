'use client';

import { useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { PassField } from '@/types';
import { CaretUp, CaretDown, InfoIcon, Trash, Plus } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { VariableChips } from '@/components/notifications/VariableChips';
import {
  VariableEditor,
  type VariableEditorHandle,
} from '@/components/notifications/VariableEditor';
import type { Locale, VariableKey } from '@/lib/template-variables';

interface FieldEditorProps {
  title: string;
  fields: PassField[];
  onChange: (fields: PassField[]) => void;
  maxFields?: number;
  /** Per-customer template variables ({{rewards_count}}, {{customer_first_name}}, ...).
   *  Inputs become pill editors and a chip row appears below the list.
   *  Off by default: BusinessInfoEditor and other static surfaces stay plain. */
  enableVariables?: boolean;
}

/** Variables that make sense on a pass field. `store_location` is per-scan,
 *  not per-customer, so the backend always strips it from pass fields: the
 *  chip is hidden here entirely. */
const FIELD_VARIABLES: VariableKey[] = [
  'stamp_count',
  'total_stamps',
  'stamps_left',
  'rewards_count',
  'reward_name',
  'business_name',
  'customer_first_name',
];

export default function FieldEditor({
  title,
  fields,
  onChange,
  maxFields = 10,
  enableVariables = false,
}: FieldEditorProps) {
  const t = useTranslations('designEditor.fieldEditor');
  const locale = useLocale() as Locale;

  // Last-focused pill editor — the chip row inserts into it. Keyed by
  // `${field.key}:${'label'|'value'}`.
  const editorRefs = useRef<Map<string, VariableEditorHandle | null>>(new Map());
  const focusedEditorKey = useRef<string | null>(null);

  const registerEditor = (key: string) => (handle: VariableEditorHandle | null) => {
    editorRefs.current.set(key, handle);
  };

  const handleInsertVariable = (variable: VariableKey) => {
    const key =
      focusedEditorKey.current ??
      (fields.length > 0 ? `${fields[fields.length - 1].key}:value` : null);
    if (!key) return;
    editorRefs.current.get(key)?.insertVariable(variable);
  };

  const addField = () => {
    if (fields.length >= maxFields) return;
    // Add directly to the list instead of staging via a `pendingField`
    // ref — typing now flows straight to formData and the card preview
    // updates per keystroke. Empty rows are harmless on the preview (just
    // blank cells); the user can remove them with the trash icon.
    onChange([
      ...fields,
      { key: `field_${Date.now()}`, label: '', value: '' },
    ]);
  };

  const updateField = (index: number, updates: Partial<PassField>) => {
    const updated = fields.map((f, i) => (i === index ? { ...f, ...updates } : f));
    onChange(updated);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const updated = [...fields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">
          {fields.length} / {maxFields}
        </span>
      </div>

      {fields.length > 0 && (
        <div className="space-y-1.5">
          {fields.map((field, index) => (
            <div
              key={field.key}
              data-field-id={field.key}
              className="flex items-center gap-2 rounded-xl p-3 bg-[#FAFAF8] border border-[#F0EFEB]"
            >
              {/* Reorder arrows */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => moveField(index, 'up')}
                  disabled={index === 0}
                  className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-default"
                  title={t('moveUp')}
                >
                  <CaretUp className="w-3 h-3" weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => moveField(index, 'down')}
                  disabled={index === fields.length - 1}
                  className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-default"
                  title={t('moveDown')}
                >
                  <CaretDown className="w-3 h-3" weight="bold" />
                </button>
              </div>

              {enableVariables ? (
                <>
                  {/* Label editor (pill-aware) */}
                  <div
                    className="w-[35%] flex-shrink-0"
                    onFocusCapture={() => {
                      focusedEditorKey.current = `${field.key}:label`;
                    }}
                  >
                    <VariableEditor
                      ref={registerEditor(`${field.key}:label`)}
                      value={field.label}
                      onChange={(next) => updateField(index, { label: next })}
                      locale={locale}
                      placeholder={t('label')}
                      ariaLabel={t('label')}
                      singleLine
                      className="min-h-9 py-1.5 text-sm font-semibold bg-white"
                    />
                  </div>

                  {/* Value editor (pill-aware) */}
                  <div
                    className="flex-1 min-w-0"
                    onFocusCapture={() => {
                      focusedEditorKey.current = `${field.key}:value`;
                    }}
                  >
                    <VariableEditor
                      ref={registerEditor(`${field.key}:value`)}
                      value={field.value}
                      onChange={(next) => updateField(index, { value: next })}
                      locale={locale}
                      placeholder={t('value')}
                      ariaLabel={t('value')}
                      singleLine
                      className="min-h-9 py-1.5 text-sm bg-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Label input */}
                  <Input
                    placeholder={t('label')}
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    className="h-9 text-sm font-semibold w-[35%] flex-shrink-0 bg-white"
                  />

                  {/* Value input */}
                  <Input
                    placeholder={t('value')}
                    value={field.value}
                    onChange={(e) => updateField(index, { value: e.target.value })}
                    className="h-9 text-sm flex-1 min-w-0 bg-white"
                  />
                </>
              )}

              {/* Delete button */}
              <button
                type="button"
                onClick={() => removeField(index)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0 transition-colors"
                title={t('remove')}
              >
                <Trash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {enableVariables && fields.length > 0 && (
        <>
          <VariableChips
            variables={FIELD_VARIABLES}
            onInsert={handleInsertVariable}
            locale={locale}
          />
          <p className="text-[11px] text-muted-foreground leading-[1.5] flex items-start gap-1.5">
            <InfoIcon className="w-3.5 h-3.5 shrink-0 mt-[1px]" weight="regular" />
            <span>{t('variablesNote')}</span>
          </p>
        </>
      )}

      {fields.length < maxFields && (
        <button
          type="button"
          onClick={addField}
          className="w-full py-3 rounded-xl border-2 border-dashed border-[#D0CDC6] bg-[#FAFAF8] text-[#777] text-sm font-medium flex items-center justify-center gap-2 transition-all hover:bg-[#F0EDE7] hover:border-[#C0BDB6] hover:text-[#555] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" weight="bold" />
          {t('addField')}
        </button>
      )}
    </div>
  );
}
