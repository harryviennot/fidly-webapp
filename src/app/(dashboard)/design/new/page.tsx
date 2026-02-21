'use client';

import { useRef, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowsClockwise, PencilSimple, FloppyDisk } from '@phosphor-icons/react';
import DesignEditorV2, { DesignEditorRef } from '@/components/design/DesignEditorV2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBusiness } from '@/contexts/business-context';
import { getPrograms } from '@/api';
import type { LoyaltyProgram } from '@/types';

export default function NewDesignPage() {
  const editorRef = useRef<DesignEditorRef>(null);
  const { currentBusiness } = useBusiness();
  const t = useTranslations('designEditor.pages');
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [designName, setDesignName] = useState(t('untitledDesign'));
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);

  useEffect(() => {
    if (!currentBusiness?.id) return;
    getPrograms(currentBusiness.id).then((programs) => {
      const p = programs.find((p) => p.is_default) || programs[0];
      if (p) setProgram(p);
    }).catch(() => {});
  }, [currentBusiness?.id]);

  const handleSave = () => {
    editorRef.current?.handleSave();
  };

  return (
    <DesignEditorV2
      ref={editorRef}
      isNew
      onSavingChange={setSaving}
      designName={designName}
      programTotalStamps={program?.config?.total_stamps}
      programName={program?.name}
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
  );
}
