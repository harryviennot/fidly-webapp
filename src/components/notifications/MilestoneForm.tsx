'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoBox } from '@/components/reusables/info-box';
import { useBusiness } from '@/contexts/business-context';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useCreateMilestone, useUpdateMilestone } from '@/hooks/use-notifications';
import {
  renderSamplePreview,
  programVariableKeys,
  PRO_ONLY_VARIABLES,
  type VariableKey,
} from '@/lib/template-variables';
import { useDefaultProgram } from '@/hooks/use-programs';
import { isPointsProgram } from '@/types';
import { ApiError } from '@/api/client';
import { SUPPORTED_LOCALES } from '@/lib/locale';
import { LocaleTabs } from './LocaleTabs';
import { VariableChips } from './VariableChips';
import { MessagePreview } from './MessagePreview';
import { VariableEditor, type VariableEditorHandle } from './VariableEditor';
import { milestoneValue } from '@/types/notification';
import type { Locale, Milestone, MilestoneMetric, MilestoneUpdate } from '@/types/notification';

/** Fill a full per-locale body record from a (possibly partial) source. */
function buildBody(src: Partial<Record<Locale, string>>): Record<Locale, string> {
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((l) => [l, src[l] ?? '']),
  ) as Record<Locale, string>;
}

function bodyUsesCustomerName(body: Record<Locale, string>): boolean {
  return Object.values(body).some((v) => /\{\{customer_first_name\}\}/.test(v));
}

const MILESTONE_VARIABLES: VariableKey[] = [
  'stamp_count',
  'total_stamps',
  'stamps_left',
  'reward_name',
  'business_name',
  'customer_first_name',
  'store_location',
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
    const { hasFeature } = useEntitlements();
    const createMutation = useCreateMilestone(currentBusiness?.id);
    const updateMutation = useUpdateMilestone(currentBusiness?.id);

    const isEditMode = milestone != null;
    const primaryLocale: Locale = currentBusiness?.primary_locale ?? 'fr';

    const { data: program } = useDefaultProgram(currentBusiness?.id);
    const isPoints = isPointsProgram(program);

    const [value, setValue] = useState<string>(
      milestone ? String(milestoneValue(milestone)) : ''
    );
    const [metric, setMetric] = useState<MilestoneMetric>(milestone?.metric ?? 'balance');
    const [locale, setLocale] = useState<Locale>(primaryLocale);
    const [bodyByLocale, setBodyByLocale] = useState<Record<Locale, string>>(
      () => buildBody(milestone?.body ?? {}),
    );
    const editorRef = useRef<VariableEditorHandle>(null);

    const valueNumber = parseInt(value, 10);
    const valueValid = !Number.isNaN(valueNumber) && valueNumber > 0;
    // The "must be below the card goal" cap only applies to a STAMP program's
    // current-balance milestone (a card has a fixed goal). Lifetime totals and
    // points balances have no upper bound.
    const enforceStampCap = !isPoints && metric === 'balance' && !!totalStamps;
    const valueInRange = !enforceStampCap || (valueValid && valueNumber < totalStamps!);
    const primaryBody = bodyByLocale[primaryLocale];
    const hasContent = primaryBody.trim().length > 0;
    const isValid = valueValid && valueInRange && hasContent;

    const isDirty =
      !isEditMode ||
      valueNumber !== milestoneValue(milestone!) ||
      metric !== (milestone!.metric ?? 'balance') ||
      SUPPORTED_LOCALES.some((l) => bodyByLocale[l] !== (milestone!.body[l] ?? ''));

    // Points programs hide the stamp-count variables; stamp programs keep the
    // existing milestone variable set untouched.
    const milestoneVariables = isPoints
      ? programVariableKeys({
          type: 'points',
          rewardCount: program.config.rewards.length,
          includeStoreLocation: true,
        })
      : MILESTONE_VARIABLES;
    const unitSample: Record<string, string> = isPoints
      ? { points_balance: value || '50' }
      : { stamp_count: value || '5' };

    const collectName = currentBusiness?.settings?.customer_data_collection?.collect_name;
    const isNameCollectionOff = collectName === 'off' || collectName === false;
    const canMultiLocation = hasFeature('locations.multiple');
    const disabledVars = new Set<VariableKey>();
    if (!isPoints && !rewardNameSet) disabledVars.add('reward_name');
    if (isNameCollectionOff) disabledVars.add('customer_first_name');
    if (!canMultiLocation) {
      for (const v of PRO_ONLY_VARIABLES) disabledVars.add(v);
    }
    const usesCustomerName = bodyUsesCustomerName(bodyByLocale);

    const insertVariable = (variable: VariableKey) => {
      editorRef.current?.insertVariable(variable);
    };

    const handleSave = async (): Promise<boolean> => {
      if (!isValid || !isDirty) return false;
      const payloadBody: Record<Locale, string> = buildBody(bodyByLocale);
      try {
        if (isEditMode && milestone) {
          const payload: MilestoneUpdate = {};
          if (
            valueNumber !== milestoneValue(milestone) ||
            metric !== (milestone.metric ?? 'balance')
          ) {
            payload.value = valueNumber;
            payload.metric = metric;
          }
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
              tMilestones('toasts.swappedOff', { stamp: milestoneValue(result.swapped_off) })
            );
          } else {
            toast.success(tMilestones('toasts.updated'));
          }
        } else {
          await createMutation.mutateAsync({ value: valueNumber, metric, body: payloadBody });
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

    const previewBody = renderSamplePreview(bodyByLocale[locale], unitSample);

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="milestone-value" className="text-xs text-muted-foreground">
            {isPoints ? tMilestones('pointsCountLabel') : tMilestones('stampCountLabel')}
            {enforceStampCap ? ` (1 - ${totalStamps! - 1})` : ''}
          </Label>
          <Input
            id="milestone-value"
            type="number"
            inputMode="numeric"
            min={1}
            max={enforceStampCap ? totalStamps! - 1 : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isPoints ? tMilestones('pointsCountPlaceholder') : tMilestones('stampCountPlaceholder')}
            className="max-w-[160px] h-11"
          />
        </div>

        {/* Threshold basis: current balance vs all-time (lifetime) total. */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{tMilestones('metricLabel')}</Label>
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--paper)] p-0.5">
            {(['balance', 'lifetime'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                aria-pressed={metric === m}
                className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  metric === m
                    ? 'bg-white shadow-sm text-[var(--foreground)]'
                    : 'text-[var(--muted-gray)] hover:text-[var(--foreground)]'
                }`}
              >
                {tMilestones(m === 'balance' ? 'metricBalance' : 'metricLifetime')}
              </button>
            ))}
          </div>
          <p className="text-[11.5px] text-muted-foreground leading-snug">
            {tMilestones(metric === 'balance' ? 'metricBalanceHelp' : 'metricLifetimeHelp')}
          </p>
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
          variables={milestoneVariables}
          onInsert={insertVariable}
          locale={locale}
          disabledVariables={disabledVars.size > 0 ? disabledVars : undefined}
          disabledTooltips={{
            reward_name: t('editor.rewardNameMissing'),
            customer_first_name: t('editor.nameCollectionOff'),
            store_location: t('editor.storeLocationPro'),
          }}
          disabledHrefs={{
            reward_name: '/program/settings',
            customer_first_name: '/program/settings',
            store_location: '/billing?from=template_var_store_location',
          }}
        />

        {valueValid && !valueInRange && enforceStampCap && (
          <InfoBox
            variant="warning"
            message={tMilestones('errors.outOfRange', { total: totalStamps! })}
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
                    ...unitSample,
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
