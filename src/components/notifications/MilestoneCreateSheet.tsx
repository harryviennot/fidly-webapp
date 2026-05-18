'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FloppyDiskIcon } from '@phosphor-icons/react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MilestoneForm, type MilestoneFormHandle, type MilestoneFormState } from './MilestoneForm';
import type { Milestone } from '@/types/notification';

interface MilestoneCreateSheetProps {
  open: boolean;
  onClose: () => void;
  /** If set, the sheet opens in edit mode pre-filled with this milestone. */
  milestone?: Milestone | null;
  totalStamps?: number;
  programName?: string | null;
  rewardNameSet?: boolean;
}

export function MilestoneCreateSheet({
  open,
  onClose,
  milestone,
  totalStamps,
  programName,
  rewardNameSet,
}: Readonly<MilestoneCreateSheetProps>) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-[520px] w-full flex flex-col">
        {open && (
          <SheetBody
            // Remount per open+milestone so state is fresh each time.
            key={`${String(open)}-${milestone?.id ?? 'new'}`}
            onClose={onClose}
            milestone={milestone ?? null}
            totalStamps={totalStamps}
            programName={programName}
            rewardNameSet={rewardNameSet}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface SheetBodyProps {
  onClose: () => void;
  milestone: Milestone | null;
  totalStamps?: number;
  programName?: string | null;
  rewardNameSet?: boolean;
}

/** Sheet-specific chrome (header + footer + Cancel/Save) around `MilestoneForm`. */
function SheetBody({
  onClose,
  milestone,
  totalStamps,
  programName,
  rewardNameSet,
}: Readonly<SheetBodyProps>) {
  const t = useTranslations('notifications');
  const tMilestones = useTranslations('notifications.milestones');
  const formRef = useRef<MilestoneFormHandle>(null);
  const [formState, setFormState] = useState<MilestoneFormState>({
    canSave: false,
    isPending: false,
  });

  const isEditMode = milestone != null;

  const handleSave = async () => {
    const ok = await formRef.current?.save();
    if (ok) onClose();
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>{isEditMode ? tMilestones('editTitle') : tMilestones('createTitle')}</SheetTitle>
        <SheetDescription>
          {isEditMode ? tMilestones('editDescription') : tMilestones('createDescription')}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 pb-2">
        <MilestoneForm
          ref={formRef}
          milestone={milestone}
          totalStamps={totalStamps}
          programName={programName}
          rewardNameSet={rewardNameSet}
          onStateChange={setFormState}
        />
      </div>

      <SheetFooter className="border-t border-border pt-4">
        <div className="flex w-full justify-end gap-2">
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
      </SheetFooter>
    </>
  );
}
