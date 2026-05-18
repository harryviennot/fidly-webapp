'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowCounterClockwiseIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  TriggerEditForm,
  type TriggerEditFormHandle,
  type TriggerEditFormState,
} from './TriggerEditForm';
import type { NotificationTemplate, Locale } from '@/types/notification';

interface TriggerEditSheetProps {
  template: NotificationTemplate | null;
  onClose: () => void;
  defaultBody: Record<Locale, string>;
  programName?: string | null;
  rewardNameSet?: boolean;
}

export function TriggerEditSheet({
  template,
  onClose,
  defaultBody,
  programName,
  rewardNameSet,
}: Readonly<TriggerEditSheetProps>) {
  return (
    <Sheet open={!!template} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[520px] w-full flex flex-col">
        {template && (
          <SheetBody
            key={template.trigger}
            template={template}
            onClose={onClose}
            defaultBody={defaultBody}
            programName={programName}
            rewardNameSet={rewardNameSet}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface SheetBodyProps {
  template: NotificationTemplate;
  onClose: () => void;
  defaultBody: Record<Locale, string>;
  programName?: string | null;
  rewardNameSet?: boolean;
}

/**
 * Sheet-specific chrome around the shared `TriggerEditForm`. Owns the header,
 * footer, and Cancel / Reset / Save buttons; delegates the form state to the
 * extracted form via ref so the wizard can reuse the same component.
 */
function SheetBody({
  template,
  onClose,
  defaultBody,
  programName,
  rewardNameSet,
}: Readonly<SheetBodyProps>) {
  const t = useTranslations('notifications');
  const formRef = useRef<TriggerEditFormHandle>(null);
  const [formState, setFormState] = useState<TriggerEditFormState>({
    canSave: false,
    isPending: false,
    isUsingDefault: template.is_using_default === true,
    isCustomized: template.is_customized === true,
  });

  const handleSave = async () => {
    const ok = await formRef.current?.save();
    if (ok) onClose();
  };

  const handleReset = async () => {
    const ok = await formRef.current?.reset();
    if (ok) onClose();
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {t('editor.editTitle')}: {t(`triggers.${template.trigger}.name`)}
        </SheetTitle>
        <SheetDescription>{t(`triggers.${template.trigger}.description`)}</SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 pb-2">
        <TriggerEditForm
          ref={formRef}
          template={template}
          defaultBody={defaultBody}
          programName={programName}
          rewardNameSet={rewardNameSet}
          onStateChange={setFormState}
        />
      </div>

      <SheetFooter className="border-t border-border pt-4">
        <div className="flex w-full items-center justify-between gap-2">
          {formState.isUsingDefault ? (
            <>
              <div />
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t('editor.cancel')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleReset} disabled={formState.isPending}>
                <ArrowCounterClockwiseIcon className="h-3.5 w-3.5" />
                {t('editor.reset')}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={formState.isPending}>
                  {t('editor.cancel')}
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={handleSave}
                  disabled={!formState.canSave || formState.isPending}
                >
                  <FloppyDiskIcon className="h-3.5 w-3.5" />
                  {formState.isPending ? '...' : t('editor.save')}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetFooter>
    </>
  );
}
