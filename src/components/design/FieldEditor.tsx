'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PassField } from '@/types';
import { CaretUp, CaretDown, Trash, Plus } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';

interface FieldEditorProps {
  title: string;
  fields: PassField[];
  onChange: (fields: PassField[]) => void;
  maxFields?: number;
  /**
   * Optional card colors. When provided, each field row is tinted with the
   * card's bg/foreground colors so the form previews how the entry will
   * appear on the actual pass — matches the "live preview" styling used by
   * the business-info entries in BackForm.
   */
  cardBg?: string;
  cardText?: string;
}

export default function FieldEditor({
  title,
  fields,
  onChange,
  maxFields = 10,
  cardBg,
  cardText,
}: FieldEditorProps) {
  const t = useTranslations('designEditor.fieldEditor');
  const [pendingField, setPendingField] = useState<PassField | null>(null);

  const totalVisible = fields.length + (pendingField ? 1 : 0);

  const addField = () => {
    if (totalVisible >= maxFields || pendingField !== null) return;
    setPendingField({ key: `field_${Date.now()}`, label: '', value: '' });
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

  const updatePendingField = (updates: Partial<PassField>) => {
    if (!pendingField) return;
    setPendingField({ ...pendingField, ...updates });
  };

  const commitPendingField = (e: React.FocusEvent) => {
    if (!pendingField) return;
    // Only commit when focus leaves the entire pending row
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (pendingField.label.trim() !== '' || pendingField.value.trim() !== '') {
      onChange([...fields, pendingField]);
    }
    setPendingField(null);
  };

  const tinted = Boolean(cardBg && cardText);
  // When tinted, inputs need a contrasting overlay so the field text remains
  // legible regardless of how dark or light the card bg is. We use a
  // semi-transparent white pane on top of the card color.
  const inputClass = tinted
    ? 'h-9 text-sm bg-white/85 backdrop-blur-sm border-0 placeholder:text-muted-foreground'
    : 'h-9 text-sm';

  const fieldRow = (
    field: PassField,
    index: number,
    onLabelChange: (v: string) => void,
    onValueChange: (v: string) => void,
    onRemove: () => void,
    disableReorder = false,
  ) => (
    <div
      key={field.key}
      data-field-id={field.key}
      className={`flex items-center gap-2 rounded-xl p-2.5 transition-shadow ${
        tinted ? 'shadow-sm' : 'bg-muted/30 border border-border'
      }`}
      style={tinted ? { backgroundColor: cardBg, color: cardText } : undefined}
    >
      {/* Reorder arrows */}
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => moveField(index, 'up')}
          disabled={disableReorder || index === 0}
          className={`w-5 h-5 flex items-center justify-center rounded transition-colors disabled:opacity-30 disabled:cursor-default ${
            tinted ? 'hover:bg-white/20' : 'text-muted-foreground hover:text-foreground'
          }`}
          title={t('moveUp')}
        >
          <CaretUp className="w-3 h-3" weight="bold" />
        </button>
        <button
          type="button"
          onClick={() => moveField(index, 'down')}
          disabled={disableReorder || index === fields.length - 1}
          className={`w-5 h-5 flex items-center justify-center rounded transition-colors disabled:opacity-30 disabled:cursor-default ${
            tinted ? 'hover:bg-white/20' : 'text-muted-foreground hover:text-foreground'
          }`}
          title={t('moveDown')}
        >
          <CaretDown className="w-3 h-3" weight="bold" />
        </button>
      </div>

      {/* Label input */}
      <Input
        placeholder={t('label')}
        value={field.label}
        onChange={(e) => onLabelChange(e.target.value)}
        className={`${inputClass} font-semibold w-[35%] flex-shrink-0`}
      />

      {/* Value input */}
      <Input
        placeholder={t('value')}
        value={field.value}
        onChange={(e) => onValueChange(e.target.value)}
        className={`${inputClass} flex-1 min-w-0`}
      />

      {/* Delete button */}
      <button
        type="button"
        onClick={onRemove}
        className={`w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors ${
          tinted
            ? 'hover:bg-white/20'
            : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
        }`}
        title={t('remove')}
      >
        <Trash className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{totalVisible} / {maxFields}</span>
      </div>

      {(fields.length > 0 || pendingField) && (
        <div className="space-y-1.5">
          {fields.map((field, index) =>
            fieldRow(
              field,
              index,
              (v) => updateField(index, { label: v }),
              (v) => updateField(index, { value: v }),
              () => removeField(index),
            ),
          )}
          {pendingField && (
            <fieldset className="contents" onBlur={commitPendingField}>
              {fieldRow(
                pendingField,
                fields.length,
                (v) => updatePendingField({ label: v }),
                (v) => updatePendingField({ value: v }),
                () => setPendingField(null),
                true,
              )}
            </fieldset>
          )}
        </div>
      )}

      {totalVisible < maxFields && (
        <button
          type="button"
          onClick={addField}
          disabled={pendingField !== null}
          className="w-full py-3 rounded-xl border-2 border-dashed border-[#D0CDC6] bg-[#FAFAF8] text-[#777] text-sm font-medium flex items-center justify-center gap-2 transition-all hover:bg-[#F0EDE7] hover:border-[#C0BDB6] hover:text-[#555] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" weight="bold" />
          {t('addField')}
        </button>
      )}
    </div>
  );
}
