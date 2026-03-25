'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { PencilSimple, FloppyDisk, ArrowsClockwise, Translate } from '@phosphor-icons/react';
import { CardDesign, CardDesignUpdate, LoyaltyProgram } from '@/types';
import { getDesign, updateDesign, getPrograms } from '@/api';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import DesignEditorV2, { DesignEditorRef } from '@/components/design/DesignEditorV2';
import { DesignEditorSkeleton } from '@/components/design/DesignEditorSkeleton';
import TranslationsDialog from '@/components/design/TranslationsDialog';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
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
  const { mutate: doUpdateBusiness } = useUpdateBusiness(currentBusiness?.id);
  const editorRef = useRef<DesignEditorRef>(null);
  const t = useTranslations('designEditor.pages');
  const tDesign = useTranslations('designEditor');
  const tEditor = useTranslations('designEditor.editor');
  const tTranslations = useTranslations('designEditor.translations');

  const [design, setDesign] = useState<CardDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [designName, setDesignName] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [translationsOpen, setTranslationsOpen] = useState(false);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const handleConfirmLeave = useCallback(() => {
    editorRef.current?.clearDraft();
  }, []);
  const { showLeaveDialog, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty, handleConfirmLeave);

  useEffect(() => {
    async function loadDesign() {
      if (!currentBusiness?.id) return;
      try {
        const [data, programs] = await Promise.all([
          getDesign(currentBusiness.id, designId),
          getPrograms(currentBusiness.id),
        ]);
        setDesign(data);
        setDesignName(data.name);
        const p = programs.find((p) => p.is_default) || programs[0];
        if (p) setProgram(p);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('failedToLoad'));
      } finally {
        setLoading(false);
      }
    }

    loadDesign();
  }, [designId, currentBusiness?.id, t]);

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
      ? t('savedActive')
      : t('savedDraft')
    );

    // Mark design as reviewed for the setup checklist
    if (currentBusiness && !currentBusiness.settings?.design_reviewed) {
      doUpdateBusiness({
        settings: { ...(currentBusiness.settings || {}), design_reviewed: true },
      });
    }

    router.push('/program/design');
  };

  // Target locale is the opposite of the business's primary locale
  const primaryLocale = currentBusiness?.primary_locale || 'fr';
  const targetLocale = primaryLocale === 'fr' ? 'en' : 'fr';

  const handleSaveTranslations = async (update: CardDesignUpdate) => {
    if (!currentBusiness?.id || !design) return;
    try {
      const updated = await updateDesign(currentBusiness.id, designId, update);
      setDesign(updated);
      toast.success(tTranslations('saved'));
    } catch {
      toast.error(tTranslations('saveFailed'));
    }
  };

  if (loading) {
    return <DesignEditorSkeleton />;
  }

  if (error || !design) {
    return (
      <div className="space-y-6">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4">
          {error || t('designNotFound')}
        </div>
        <Button variant="outline" asChild>
          <Link href="/">{t('backToLoyaltyProgram')}</Link>
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
        onDirtyChange={setIsDirty}
        onSave={handleSaveComplete}
        designName={designName}
        programTotalStamps={program?.config?.total_stamps}
        programName={program?.name}
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
            )}
            {design.is_active && (
              <Badge variant="default">{tDesign('active')}</Badge>
            )}
          </div>
        }
        headerRight={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setTranslationsOpen(true)}
            >
              <Translate className="w-4 h-4 mr-2" weight="bold" />
              {tTranslations('button')}
            </Button>
            <Button className="rounded-full bg-black text-white hover:bg-black/80" onClick={handleSaveClick} disabled={saving}>
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
          </div>
        }
      />

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('updateActiveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('updateActiveDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent)]/90" onClick={handleConfirmSave}>
              {t('saveAndUpdate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TranslationsDialog
        open={translationsOpen}
        onOpenChange={setTranslationsOpen}
        design={design}
        translations={design.translations || {}}
        primaryLocale={primaryLocale}
        targetLocale={targetLocale}
        onSave={handleSaveTranslations}
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
