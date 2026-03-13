'use client';

import { useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowsClockwise, PencilSimple, FloppyDisk } from '@phosphor-icons/react';
import DesignEditorV2, { DesignEditorRef } from '@/components/design/DesignEditorV2';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { Button } from '@/components/ui/button';
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
import { useBusiness } from '@/contexts/business-context';
import { useDefaultProgram } from '@/hooks/use-programs';

export default function NewDesignPage() {
  const editorRef = useRef<DesignEditorRef>(null);
  const { currentBusiness } = useBusiness();
  const t = useTranslations('designEditor.pages');
  const tEditor = useTranslations('designEditor.editor');
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [designName, setDesignName] = useState(t('untitledDesign'));
  const [isDirty, setIsDirty] = useState(false);

  const { data: program, isLoading: programLoading } = useDefaultProgram(currentBusiness?.id);

  const handleConfirmLeave = useCallback(() => {
    editorRef.current?.clearDraft();
  }, []);
  const { showLeaveDialog, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty, handleConfirmLeave);

  const handleSave = () => {
    editorRef.current?.handleSave();
  };

  if (programLoading) return null;

  return (
    <>
      <DesignEditorV2
        ref={editorRef}
        isNew
        onSavingChange={setSaving}
        onDirtyChange={setIsDirty}
        designName={designName}
        programTotalStamps={program?.config?.total_stamps}
        programName={program?.name}
        programRewardName={program?.reward_name}
        headerLeft={
          editingName ? (
            <Input
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              autoFocus
              className="text-2xl font-bold h-auto py-1 w-64"
              placeholder={t('designNamePlaceholder')}
            />
          ) : (
            <div
              className="group flex items-center gap-2 cursor-pointer"
              onClick={() => setEditingName(true)}
            >
              <h2 className="text-2xl font-bold">{designName || t('untitledDesign')}</h2>
              <PencilSimple
                className="w-4 h-4 text-muted-foreground/60"
                weight="bold"
              />
            </div>
          )
        }
        headerRight={
          <Button className="rounded-full bg-black text-white hover:bg-black/80" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <ArrowsClockwise className="w-4 h-4 mr-2 animate-spin" />
                {t('saving')}
              </>
            ) : (
              <>
                <FloppyDisk className="w-4 h-4 mr-2" weight="bold" />
                {t('saveDesign')}
              </>
            )}
          </Button>
        }
      />

      <AlertDialog open={showLeaveDialog} onOpenChange={(open) => !open && cancelLeave()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tEditor('unsavedChangesTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tEditor('unsavedChangesDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" onClick={cancelLeave}>{tEditor('stayOnPage')}</AlertDialogCancel>
            <AlertDialogAction className="rounded-full" onClick={confirmLeave}>{tEditor('leaveWithoutSaving')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
