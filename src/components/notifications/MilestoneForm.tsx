'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoBox } from '@/components/reusables/info-box';
import { useBusiness } from '@/contexts/business-context';
import { useCreateMilestone, useUpdateMilestone } from '@/hooks/use-notifications';
import { renderSamplePreview, type VariableKey } from '@/lib/template-variables';
import { ApiError } from '@/api/client';
import { LocaleTabs } from './LocaleTabs';
import { VariableChips } from './VariableChips';
import { MessagePreview } from './MessagePreview';
import { VariableEditor, type VariableEditorHandle } from './VariableEditor';
import type { Locale, Milestone, MilestoneUpdate } from '@/types/notification';

function bodyUsesCustomerName(body: Record<Locale, string>): boolean {
  return /\{\{customer_first_name\}\}/.test(body.en) || /\{\{customer_first_name\}\}/.test(body.fr);
}

const MILESTONE_VARIABLES: VariableKey[] = [
  'stamp_count',
  'total_stamps',
  'stamps_left',
  'reward_name',
  'business_name',
  'customer_first_name',
];

export interface MilestoneFormState {
  canSave: boolean;
  isPending: boolean;
}

export interface MilestoneFormHandle {
  save: () => Promise<boolean>;
  canSave: boolean;
  isPending: boolean;
}

interface MilestoneFormProps {
  /** When provided, the form opens in edit mode pre-filled with this milestone. */
  milestone?: Milestone | null;
  totalStamps?: number;
  programName?: string | null;
  rewardNameSet?: boolean;
  /** Called after a successful create or update. Sheet closes; wizard advances. */
  onSaved?: () => void;
  onStateChange?: (state: MilestoneFormState) => void;
}

/**
 * Shared body for the milestone create/edit experience: stamp count input,
 * locale tabs, variable editor, chips, and live preview. Owns its create/
 * update mutations but not its action buttons — drives `save` via the
 * imperative handle so the Sheet (notifications page) and the wizard's
 * MilestonesStep can wrap it with their own footers.
 */
export const MilestoneForm = forwardRef<MilestoneFormHandle, MilestoneFormProps>(
  function MilestoneForm(
    { milestone, totalStamps, programName, rewardNameSet, onSaved, onStateChange },
    ref
  ) {
    const t = useTranslations('notifications');
    const tMilestones = useTranslations('notifications.milestones');
    const { currentBusiness } = useBusiness();
    const createMutation = useCreateMilestone(currentBusiness?.id);
    const updateMutation = useUpdateMilestone(currentBusiness?.id);

    const isEditMode = milestone != null;
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
    const stampInRange = !totalStamps || (stampValid && stampNumber < totalStamps);
    const primaryBody = bodyByLocale[primaryLocale];
    const hasContent = primaryBody.trim().length > 0;
    const isValid = stampValid && stampInRange && hasContent;

    const isDirty =
      !isEditMode ||
      stampNumber !== milestone!.stamp_equals ||
      bodyByLocale.en !== (milestone!.body.en ?? '') ||
      bodyByLocale.fr !== (milestone!.body.fr ?? '');

    const collectName = currentBusiness?.settings?.customer_data_collection?.collect_name;
    const isNameCollectionOff = collectName === 'off' || collectName === false;
    const disabledVars = new Set<VariableKey>();
    if (!rewardNameSet) disabledVars.add('reward_name');
    if (isNameCollectionOff) disabledVars.add('customer_first_name');
    const usesCustomerName = bodyUsesCustomerName(bodyByLocale);

    const insertVariable = (variable: VariableKey) => {
      editorRef.current?.insertVariable(variable);
    };

    const handleSave = async (): Promise<boolean> => {
      if (!isValid || !isDirty) return false;
      const payloadBody: Record<Locale, string> = {
        en: bodyByLocale.en,
        fr: bodyByLocale.fr,
      };
      try {
        if (isEditMode && milestone) {
          const payload: MilestoneUpdate = {};
          if (stampNumber !== milestone.stamp_equals) payload.stamp_equals = stampNumber;
          if (
            payloadBody.en !== (milestone.body.en ?? '') ||
            payloadBody.fr !== (milestone.body.fr ?? '')
          ) {
            payload.body = payloadBody;
          }
          const result = await updateMutation.mutateAsync({
            templateId: milestone.id,
            payload,
          });
          if (result?.swapped_off) {
            toast.warning(
              tMilestones('toasts.swappedOff', { stamp: result.swapped_off.stamp_equals })
            );
          } else {
            toast.success(tMilestones('toasts.updated'));
          }
        } else {
          await createMutation.mutateAsync({ stamp_equals: stampNumber, body: payloadBody });
          toast.success(tMilestones('toasts.created'));
        }
        onSaved?.();
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'DUPLICATE_MILESTONE') {
            toast.error(tMilestones('errors.duplicate'));
            return false;
          }
          if (err.code === 'QUOTA_EXCEEDED') {
            toast.error(tMilestones('errors.quotaExceeded'));
            return false;
          }
        }
        toast.error(
          err instanceof Error
            ? err.message
            : tMilestones(isEditMode ? 'toasts.updateFailed' : 'toasts.createFailed')
        );
        return false;
      }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;
    const canSave = isValid && isDirty;

    useImperativeHandle(
      ref,
      () => ({ save: handleSave, canSave, isPending }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [canSave, isPending]
    );

    useEffect(() => {
      onStateChange?.({ canSave, isPending });
    }, [canSave, isPending, onStateChange]);

    const previewBody = renderSamplePreview(bodyByLocale[locale], {
      stamp_count: stampEquals || '5',
    });

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="stamp-equals" className="text-xs text-muted-foreground">
            {tMilestones('stampCountLabel')}
            {totalStamps ? ` (1 - ${totalStamps - 1})` : ''}
          </Label>
          <Input
            id="stamp-equals"
            type="number"
            inputMode="numeric"
            min={1}
            max={totalStamps ? totalStamps - 1 : undefined}
            value={stampEquals}
            onChange={(e) => setStampEquals(e.target.value)}
            placeholder={tMilestones('stampCountPlaceholder')}
            className="max-w-[160px] h-11"
          />
        </div>

        <LocaleTabs value={locale} onValueChange={setLocale} primaryLocale={primaryLocale} />

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t('editor.bodyLabel')}</Label>
          <VariableEditor
            key={locale}
            ref={editorRef}
            value={bodyByLocale[locale]}
            onChange={(next) => setBodyByLocale((prev) => ({ ...prev, [locale]: next }))}
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
          disabledVariables={disabledVars.size > 0 ? disabledVars : undefined}
          disabledTooltips={{
            reward_name: t('editor.rewardNameMissing'),
            customer_first_name: t('editor.nameCollectionOff'),
          }}
          disabledHrefs={{
            reward_name: '/program/settings',
            customer_first_name: '/program/settings',
          }}
        />

        {stampValid && !stampInRange && totalStamps && (
          <InfoBox
            variant="warning"
            message={tMilestones('errors.outOfRange', { total: totalStamps })}
          />
        )}

        {usesCustomerName && <InfoBox variant="warning" message={t('editor.nameWarning')} />}

        <div className="pt-2">
          <Label className="text-xs text-muted-foreground mb-2 block">
            {t('editor.previewLabel')}
          </Label>
          <div className="flex justify-center">
            <MessagePreview
              iconUrl={currentBusiness?.icon_url ?? null}
              iconOriginalUrl={currentBusiness?.icon_original_url ?? null}
              programName={programName}
              businessName={currentBusiness?.name ?? ''}
              body={previewBody}
            />
          </div>
          {usesCustomerName && (
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground mb-2 block text-center">
                {t('editor.previewWithoutName')}
              </Label>
              <div className="flex justify-center">
                <MessagePreview
                  iconUrl={currentBusiness?.icon_url ?? null}
                  iconOriginalUrl={currentBusiness?.icon_original_url ?? null}
                  programName={programName}
                  businessName={currentBusiness?.name ?? ''}
                  body={renderSamplePreview(bodyByLocale[locale], {
                    stamp_count: stampEquals || '5',
                    customer_first_name: '',
                  })}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);
