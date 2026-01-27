'use client';

import { PassField } from '@/types';

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
    <div className="field-editor">
      <div className="field-editor-header">
        <span className="field-editor-title">{title}</span>
        <span className="field-editor-count">{fields.length} / {maxFields}</span>
      </div>

      {fields.length > 0 && (
        <div className="field-editor-list">
          {fields.map((field, index) => (
            <div key={field.key} className="field-editor-item">
              <div className="field-inputs">
                <input
                  type="text"
                  placeholder="Label"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  className="field-input-label"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={field.value}
                  onChange={(e) => updateField(index, { value: e.target.value })}
                  className="field-input-value"
                />
              </div>
              <div className="field-actions">
                <button
                  type="button"
                  onClick={() => moveField(index, 'up')}
                  disabled={index === 0}
                  className="btn-move"
                  title="Move up"
                >
                  ^
                </button>
                <button
                  type="button"
                  onClick={() => moveField(index, 'down')}
                  disabled={index === fields.length - 1}
                  className="btn-move"
                  title="Move down"
                >
                  v
                </button>
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="btn-remove"
                  title="Remove"
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {fields.length < maxFields && (
        <button type="button" onClick={addField} className="btn-add-field">
          + Add {title.replace(/s$/, '')}
        </button>
      )}
    </div>
  );
}
