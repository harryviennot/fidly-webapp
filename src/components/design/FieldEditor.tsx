'use client';

import { PassField } from '@/types';
import { ArrowUp, ArrowDown, Trash, Plus } from '@phosphor-icons/react';
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
  const addField = () => {
    if (fields.length >= maxFields) return;
    const newKey = `field_${Date.now()}`;
    onChange([...fields, { key: newKey, label: '', value: '' }]);
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{fields.length} / {maxFields}</span>
      </div>

      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.key} className="flex items-start gap-2">
              <div className="flex-1 flex flex-col gap-1.5">
                <Input
                  placeholder="Label"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  className="h-9 text-sm"
                />
                <textarea
                  placeholder="Value"
                  value={field.value}
                  onChange={(e) => updateField(index, { value: e.target.value })}
                  rows={1}
                  className="min-h-[36px] border border-input bg-background text-sm rounded-md px-3 py-2 w-full resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  style={{ fieldSizing: 'content' } as React.CSSProperties}
                />
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveField(index, 'up')}
                  disabled={index === 0}
                  title="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveField(index, 'down')}
                  disabled={index === fields.length - 1}
                  title="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeField(index)}
                  title="Remove"
                >
                  <Trash className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {fields.length < maxFields && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addField}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add {title.replace(/s$/, '')}
        </Button>
      )}
    </div>
  );
}
