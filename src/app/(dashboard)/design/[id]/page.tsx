'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { PencilSimple, FloppyDisk, ArrowsClockwise, Translate } from '@phosphor-icons/react';
import { CardDesign, CardDesignUpdate } from '@/types';
import { getDesign, updateDesign } from '@/api';
import { useBusiness } from '@/contexts/business-context';
import DesignEditorV2, { DesignEditorRef } from '@/components/design/DesignEditorV2';
import TranslationsDialog from '@/components/design/TranslationsDialog';
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
  const t = useTranslations('designEditor.pages');
  const tDesign = useTranslations('designEditor');
  const tTranslations = useTranslations('designEditor.translations');

  const [design, setDesign] = useState<CardDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [designName, setDesignName] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [translationsOpen, setTranslationsOpen] = useState(false);

  useEffect(() => {
    async function loadDesign() {
      if (!currentBusiness?.id) return;
      try {
        const data = await getDesign(currentBusiness.id, designId);
        setDesign(data);
        setDesignName(data.name);
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
    router.push('/');
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
    </>
  );
}
