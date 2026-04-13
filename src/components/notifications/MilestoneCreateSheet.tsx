'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoBox } from '@/components/reusables/info-box';
import { useBusiness } from '@/contexts/business-context';
import {
  useCreateMilestone,
  useUpdateMilestone,
} from '@/hooks/use-notifications';
import {
  renderSamplePreview,
  type VariableKey,
} from '@/lib/template-variables';
import { ApiError } from '@/api/client';
import { LocaleTabs } from './LocaleTabs';
import { VariableChips } from './VariableChips';
import { MessagePreview } from './MessagePreview';
import {
  VariableEditor,
  type VariableEditorHandle,
} from './VariableEditor';
import type { Locale, Milestone, MilestoneUpdate } from '@/types/notification';

interface MilestoneCreateSheetProps {
  open: boolean;
  onClose: () => void;
  /** If set, the sheet opens in edit mode pre-filled with this milestone. */
  milestone?: Milestone | null;
  /** Upper bound hint — total stamps required by the active program, if known. */
  totalStamps?: number;
  /** Loyalty program name — used as the title in the notification preview. */
  programName?: string | null;
  /** Whether the active program has a reward name set — greys out the chip. */
  rewardNameSet?: boolean;
}

// Variables greyed out when the program has no reward name configured.
const DISABLED_WITHOUT_REWARD_NAME: ReadonlySet<VariableKey> = new Set([
  'reward_name',
]);

// All variables available for milestones. `reward_name` is included here
// now that the backend injects it from `program.reward_name` into every
// trigger's base context (see backend/app/services/programs/service.py).
// When the program has no reward name set, the notifications page greys
// out the chip and the sidebar row — see VariableChips `disabledVariables`.
const MILESTONE_VARIABLES: VariableKey[] = [
  'stamp_count',
  'total_stamps',
  'stamps_left',
  'reward_name',
  'business_name',
  'customer_first_name',
];

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
          // Remount per open+milestone so state is fresh each time
          <MilestoneForm
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

interface MilestoneFormProps {
  onClose: () => void;
  milestone: Milestone | null;
  totalStamps?: number;
  programName?: string | null;
  rewardNameSet?: boolean;
}

function MilestoneForm({
  onClose,
  milestone,
  totalStamps,
  programName,
  rewardNameSet,
}: Readonly<MilestoneFormProps>) {
  const t = useTranslations('notifications');
  const tMilestones = useTranslations('notifications.milestones');
  const { currentBusiness } = useBusiness();
  const createMutation = useCreateMilestone(currentBusiness?.id);
  const updateMutation = useUpdateMilestone(currentBusiness?.id);

  const isEditMode = milestone !== null;
  const primaryLocale: Locale = currentBusiness?.primary_locale ?? 'fr';

  const [stampEquals, setStampEquals] = useState<string>(
    milestone ? String(milestone.stamp_equals) : ''
  );
  const [locale, setLocale] = useState<Locale>(primaryLocale);
  const [bodyByLocale, setBodyByLocale] = useState<Record<Locale, string>>({
    en: milestone?.body.en ?? '',
    fr: milestone?.body.fr ?? '',
  });
  const editorRef = useRef<VariableEditorHandle>(null);

  const stampNumber = parseInt(stampEquals, 10);
  const stampValid = !Number.isNaN(stampNumber) && stampNumber > 0;
  const stampInRange =
    !totalStamps || (stampValid && stampNumber < totalStamps);
  const primaryBody = bodyByLocale[primaryLocale];
  const hasContent = primaryBody.trim().length > 0;
  const isValid = stampValid && stampInRange && hasContent;

  // Detect whether anything actually changed (edit mode only — disables Save until user edits)
  const isDirty =
    !isEditMode ||
    stampNumber !== milestone.stamp_equals ||
    bodyByLocale.en !== (milestone.body.en ?? '') ||
    bodyByLocale.fr !== (milestone.body.fr ?? '');

  const insertVariable = (variable: VariableKey) => {
    editorRef.current?.insertVariable(variable);
  };

  const handleSave = async () => {
    if (!isValid) return;
    const payloadBody: Record<Locale, string> = {
      en: bodyByLocale.en,
      fr: bodyByLocale.fr,
    };
    try {
      if (isEditMode) {
        // Only send changed fields
        const payload: MilestoneUpdate = {};
        if (stampNumber !== milestone.stamp_equals) {
          payload.stamp_equals = stampNumber;
        }
        if (
          payloadBody.en !== (milestone.body.en ?? '') ||
          payloadBody.fr !== (milestone.body.fr ?? '')
        ) {
          payload.body = payloadBody;
        }
        await updateMutation.mutateAsync({
          templateId: milestone.id,
          payload,
        });
        toast.success(tMilestones('toasts.updated'));
      } else {
        await createMutation.mutateAsync({
          stamp_equals: stampNumber,
          body: payloadBody,
        });
        toast.success(tMilestones('toasts.created'));
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'DUPLICATE_MILESTONE') {
          toast.error(tMilestones('errors.duplicate'));
          return;
        }
        if (err.code === 'QUOTA_EXCEEDED') {
          toast.error(tMilestones('errors.quotaExceeded'));
          return;
        }
      }
      toast.error(
        err instanceof Error
          ? err.message
          : tMilestones(isEditMode ? 'toasts.updateFailed' : 'toasts.createFailed')
      );
    }
  };

  const previewBody = renderSamplePreview(bodyByLocale[locale], {
    stamp_count: stampEquals || '5',
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {isEditMode ? tMilestones('editTitle') : tMilestones('createTitle')}
        </SheetTitle>
        <SheetDescription>
          {isEditMode
            ? tMilestones('editDescription')
            : tMilestones('createDescription')}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-4">
        {/* Stamp count input */}
        <div className="space-y-2">
          <Label
            htmlFor="stamp-equals"
            className="text-xs text-muted-foreground"
          >
            {tMilestones('stampCountLabel')}
            {totalStamps ? ` (1 - ${totalStamps - 1})` : ''}
          </Label>
          <Input
            id="stamp-equals"
            type="number"
            min={1}
            max={totalStamps ? totalStamps - 1 : undefined}
            value={stampEquals}
            onChange={(e) => setStampEquals(e.target.value)}
            placeholder={tMilestones('stampCountPlaceholder')}
            className="max-w-[160px]"
          />
        </div>

        {/* Body editor */}
        <LocaleTabs
          value={locale}
          onValueChange={setLocale}
          primaryLocale={primaryLocale}
        />
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t('editor.bodyLabel')}
          </Label>
          <VariableEditor
            key={locale}
            ref={editorRef}
            value={bodyByLocale[locale]}
            onChange={(next) =>
              setBodyByLocale((prev) => ({ ...prev, [locale]: next }))
            }
            locale={locale}
            placeholder={
              locale === 'fr'
                ? 'Vous êtes à mi-chemin de votre récompense !'
                : "You're halfway to your reward!"
            }
            ariaLabel={t('editor.bodyLabel')}
          />
        </div>

        <VariableChips
          variables={MILESTONE_VARIABLES}
          onInsert={insertVariable}
          locale={locale}
          disabledVariables={
            rewardNameSet ? undefined : DISABLED_WITHOUT_REWARD_NAME
          }
          disabledTooltips={{
            reward_name: t('editor.rewardNameMissing'),
          }}
          disabledHrefs={{ reward_name: '/program/settings' }}
        />

        {stampValid && !stampInRange && (
          <InfoBox
            variant="warning"
            message={`Stamp count must be less than ${totalStamps} (total stamps in your program).`}
          />
        )}

        <div className="pt-2">
          <Label className="text-xs text-muted-foreground mb-2 block">
            {t('editor.previewLabel')}
          </Label>
          <div className="flex justify-center">
            <MessagePreview
              iconUrl={currentBusiness?.icon_url ?? null}
              programName={programName}
              businessName={currentBusiness?.name ?? ''}
              body={previewBody}
            />
          </div>
        </div>
      </div>

      <SheetFooter className="border-t border-border pt-4">
        <div className="flex w-full justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={pending}
          >
            {t('editor.cancel')}
          </Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={handleSave}
            disabled={!isValid || !isDirty || pending}
          >
            <FloppyDiskIcon className="h-3.5 w-3.5" />
            {pending ? '...' : t('editor.save')}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
