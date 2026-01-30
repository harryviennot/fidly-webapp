'use client';

import { useRef, useState } from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import DesignEditorV2, { DesignEditorRef } from '@/components/design/DesignEditorV2';
import { Button } from '@/components/ui/button';

export default function NewDesignPage() {
  const editorRef = useRef<DesignEditorRef>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    editorRef.current?.handleSave();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Create New Design</h2>
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
      <DesignEditorV2 ref={editorRef} isNew onSavingChange={setSaving} />
    </div>
  );
}
