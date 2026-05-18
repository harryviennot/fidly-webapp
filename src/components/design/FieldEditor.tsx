'use client';

import { useTranslations } from 'next-intl';
import { PassField } from '@/types';
import { CaretUp, CaretDown, Trash, Plus } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';

interface FieldEditorProps {
  title: string;
  fields: PassField[];
  onChange: (fields: PassField[]) => void;
  maxFields?: number;
}

export default function FieldEditor({
  title,
  fields,
  onChange,
  maxFields = 10,
}: FieldEditorProps) {
  const t = useTranslations('designEditor.fieldEditor');

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
