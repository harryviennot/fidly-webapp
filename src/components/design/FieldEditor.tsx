'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PassField } from '@/types';
import { CaretUp, CaretDown, Trash, Plus } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    const updated = { ...pendingField, ...updates };
    if (updated.label.trim() !== '' || updated.value.trim() !== '') {
      onChange([...fields, updated]);
      setPendingField(null);
    } else {
      setPendingField(updated);
    }
  };

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
      className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl p-2.5"
    >
      {/* Reorder arrows */}
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => moveField(index, 'up')}
          disabled={disableReorder || index === 0}
          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-default transition-colors"
          title={t('moveUp')}
        >
          <CaretUp className="w-3 h-3" weight="bold" />
        </button>
        <button
          type="button"
          onClick={() => moveField(index, 'down')}
          disabled={disableReorder || index === fields.length - 1}
          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-default transition-colors"
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
        className="h-9 text-sm font-semibold w-[35%] flex-shrink-0"
      />

      {/* Value input */}
      <Input
        placeholder={t('value')}
        value={field.value}
        onChange={(e) => onValueChange(e.target.value)}
        className="h-9 text-sm flex-1 min-w-0"
      />

      {/* Delete button */}
      <button
        type="button"
        onClick={onRemove}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0 transition-colors"
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
          {pendingField &&
            fieldRow(
              pendingField,
              fields.length,
              (v) => updatePendingField({ label: v }),
              (v) => updatePendingField({ value: v }),
              () => setPendingField(null),
              true,
            )}
        </div>
      )}

      {totalVisible < maxFields && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={addField}
          disabled={pendingField !== null}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {t('addField')}
        </Button>
      )}
    </div>
  );
}
