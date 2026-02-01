'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowsClockwise, PencilSimple } from '@phosphor-icons/react';
import { CardDesign } from '@/types';
import { getDesign } from '@/api';
import { useBusiness } from '@/contexts/business-context';
import DesignEditorV2, { DesignEditorRef } from '@/components/design/DesignEditorV2';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function EditDesignPage() {
  const params = useParams();
  const designId = params.id as string;
  const { currentBusiness } = useBusiness();
  const editorRef = useRef<DesignEditorRef>(null);

  const [design, setDesign] = useState<CardDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [designName, setDesignName] = useState('');

  useEffect(() => {
    async function loadDesign() {
      if (!currentBusiness?.id) return;
      try {
        const data = await getDesign(currentBusiness.id, designId);
        setDesign(data);
        setDesignName(data.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load design');
      } finally {
        setLoading(false);
      }
    }

    loadDesign();
  }, [designId, currentBusiness?.id]);

  const handleSave = () => {
    editorRef.current?.handleSave();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !design) {
    return (
      <div className="space-y-6">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
          {error || 'Design not found'}
        </div>
        <Button variant="outline" asChild>
          <Link href="/design">Back to Designs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
          {design.is_active && (
            <Badge variant="default">Active</Badge>
          )}
        </div>
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
      <DesignEditorV2 ref={editorRef} design={design} onSavingChange={setSaving} designName={designName} onNameChange={setDesignName} />
    </div>
  );
}
