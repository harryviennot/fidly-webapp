'use client';

import { useRef, useState } from 'react';
import { ArrowsClockwise, PencilSimple } from '@phosphor-icons/react';
import DesignEditorV2, { DesignEditorRef } from '@/components/design/DesignEditorV2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewDesignPage() {
  const editorRef = useRef<DesignEditorRef>(null);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [designName, setDesignName] = useState('');

  const handleSave = () => {
    editorRef.current?.handleSave();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {editingName ? (
          <Input
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
            autoFocus
            className="text-2xl font-bold h-auto py-1 w-64"
            placeholder="Design name..."
          />
        ) : (
          <div
            className="group flex items-center gap-2 cursor-pointer"
            onClick={() => setEditingName(true)}
          >
            <h2 className="text-2xl font-bold">{designName || 'Untitled Design'}</h2>
            <PencilSimple
              className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              weight="bold"
            />
          </div>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <ArrowsClockwise className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Design'
          )}
        </Button>
      </div>
      <DesignEditorV2 ref={editorRef} isNew onSavingChange={setSaving} designName={designName} />
    </div>
  );
}
