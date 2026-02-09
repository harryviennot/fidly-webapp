'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PencilSimple, FloppyDisk, ArrowsClockwise } from '@phosphor-icons/react';
import { CardDesign } from '@/types';
import { getDesign } from '@/api';
import { useBusiness } from '@/contexts/business-context';
import DesignEditorV2, { DesignEditorRef } from '@/components/design/DesignEditorV2';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function EditDesignPage() {
  const params = useParams();
  const router = useRouter();
  const designId = params.id as string;
  const { currentBusiness } = useBusiness();
  const editorRef = useRef<DesignEditorRef>(null);

  const [design, setDesign] = useState<CardDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [designName, setDesignName] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

  const handleSaveClick = () => {
    if (design?.is_active) {
      setShowConfirmDialog(true);
    } else {
      editorRef.current?.handleSave();
    }
  };

  const handleConfirmSave = () => {
    setShowConfirmDialog(false);
    editorRef.current?.handleSave();
  };

  const handleSaveComplete = () => {
    toast.success(design?.is_active
      ? 'Design saved! Your customers\' cards will update shortly.'
      : 'Design saved successfully.'
    );
    router.push('/');
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
          <Link href="/">Back to Loyalty Program</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <DesignEditorV2
        ref={editorRef}
        design={design}
        onSavingChange={setSaving}
        onSave={handleSaveComplete}
        designName={designName}
        headerLeft={
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
                  className="w-4 h-4 text-muted-foreground/60"
                  weight="bold"
                />
              </div>
            )}
            {design.is_active && (
              <Badge variant="default">Active</Badge>
            )}
          </div>
        }
        headerRight={
          <Button className="rounded-full bg-black text-white hover:bg-black/80" onClick={handleSaveClick} disabled={saving}>
            {saving ? (
              <>
                <ArrowsClockwise className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FloppyDisk className="w-4 h-4 mr-2" weight="bold" />
                Save Design
              </>
            )}
          </Button>
        }
      />

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update active design?</AlertDialogTitle>
            <AlertDialogDescription>
              This will automatically update all of your customers&apos; cards to reflect this design.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent)]/90" onClick={handleConfirmSave}>
              Save & Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
