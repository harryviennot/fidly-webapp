'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { InfoBox } from '@/components/reusables/info-box';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/contexts/business-context';
import { useEntitlements } from '@/hooks/useEntitlements';
import {
  useUpdateNotificationTemplate,
  useResetNotificationTemplate,
} from '@/hooks/use-notifications';
import {
  renderSamplePreview,
  triggerVariableKeys,
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
import type { NotificationTemplate, Locale } from '@/types/notification';

/** Fill a full per-locale body record from a (possibly partial) source. */
function buildBody(src: Partial<Record<Locale, string>>): Record<Locale, string> {
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((l) => [l, src[l] ?? '']),
  ) as Record<Locale, string>;
}

function bodyUsesCustomerName(body: Record<Locale, string>): boolean {
  return Object.values(body).some((v) => /\{\{customer_first_name\}\}/.test(v));
}

export interface TriggerEditFormHandle {
  save: () => Promise<boolean>;
  reset: () => Promise<boolean>;
  /** True when the user has unsaved edits AND the primary locale isn't blank. */
  canSave: boolean;
  /** Mid-mutation, parents should disable any external action that would race. */
  isPending: boolean;
  /** Starter businesses showing default copy — body editor is read-only. */
  isUsingDefault: boolean;
  /** Whether the template diverges from defaults — gates the Reset action. */
  isCustomized: boolean;
}

export interface TriggerEditFormState {
  canSave: boolean;
  isPending: boolean;
  isUsingDefault: boolean;
  isCustomized: boolean;
}

interface TriggerEditFormProps {
  template: NotificationTemplate;
  /** Default un-customised body — used by the per-locale reset link. */
  defaultBody: Record<Locale, string>;
  programName?: string | null;
  rewardNameSet?: boolean;
  /** Called after a successful save. Sheet uses it to close; wizard uses it to advance. */
  onSaved?: () => void;
  /**
   * Notifies the parent when canSave / isPending change. Parents (Sheet,
   * wizard) use it to drive their action buttons reactively — reading the
   * imperative handle alone is non-reactive.
   */
  onStateChange?: (state: TriggerEditFormState) => void;
}

/**
 * Body-only notification template editor: enable toggle, locale tabs, variable
 * editor, insertable chips, and the live preview. Owns its mutation state but
 * not its action buttons — callers (Sheet, wizard) drive save/reset via the
 * imperative handle.
 *
 * Two consumers today:
 *  - `TriggerEditSheet` mounts this inside a shadcn Sheet with its own footer.
 *  - `TransactionalStep` (wizard Ch 6 step 2) renders it inline.
 */
export const TriggerEditForm = forwardRef<TriggerEditFormHandle, TriggerEditFormProps>(
  function TriggerEditForm(
    { template, defaultBody, programName, rewardNameSet, onSaved, onStateChange },
    ref
  ) {
    const t = useTranslations('notifications');
    const tToast = useTranslations('notifications.toasts');
    const { currentBusiness } = useBusiness();
    const { hasFeature } = useEntitlements();
    const updateMutation = useUpdateNotificationTemplate(currentBusiness?.id);
    const resetMutation = useResetNotificationTemplate(currentBusiness?.id);

    const primaryLocale: Locale = currentBusiness?.primary_locale ?? 'fr';
    const isUsingDefault = template.is_using_default === true;

    const [locale, setLocale] = useState<Locale>(primaryLocale);
    const [bodyByLocale, setBodyByLocale] = useState<Record<Locale, string>>(
      () => buildBody(template.body),
    );
    const [isEnabled, setIsEnabled] = useState<boolean>(template.is_enabled !== false);
    const editorRef = useRef<VariableEditorHandle>(null);
    const { data: program } = useDefaultProgram(currentBusiness?.id);
    const isPoints = isPointsProgram(program);

    const insertableVariables = triggerVariableKeys({
      type: program?.type,
      rewardCount: isPoints ? program.config.rewards.length : 0,
      trigger: template.trigger,
      includeStoreLocation: true,
    });

    const collectName = currentBusiness?.settings?.customer_data_collection?.collect_name;
    const isNameCollectionOff = collectName === 'off' || collectName === false;
    const canMultiLocation = hasFeature('locations.multiple');
    const disabledVars = new Set<VariableKey>();
    // Points resolve {{reward_name}} from the reward ladder; only stamp
    // programs gate it on the program-level reward label.
    if (!isPoints && !rewardNameSet) disabledVars.add('reward_name');
    if (isNameCollectionOff) disabledVars.add('customer_first_name');
    if (!canMultiLocation) {
      for (const v of PRO_ONLY_VARIABLES) disabledVars.add(v);
    }
    const usesCustomerName = bodyUsesCustomerName(bodyByLocale);

    const currentBody = bodyByLocale[locale];
    const primaryBody = bodyByLocale[primaryLocale];

    const isBodyDirty =
      !isUsingDefault &&
      SUPPORTED_LOCALES.some((l) => bodyByLocale[l] !== (template.body[l] ?? ''));
    const isEnabledDirty = isEnabled !== (template.is_enabled !== false);

    const canSave =
      (isBodyDirty || isEnabledDirty) &&
      (!isBodyDirty || primaryBody.trim().length > 0);

    const insertVariable = (key: VariableKey) => {
      editorRef.current?.insertVariable(key);
    };

    const resetLocaleBody = (loc: Locale) => {
      setBodyByLocale((prev) => ({ ...prev, [loc]: defaultBody[loc] ?? '' }));
    };

    const handleSave = async (): Promise<boolean> => {
      try {
        await updateMutation.mutateAsync({
          trigger: template.trigger,
          body: isBodyDirty ? buildBody(bodyByLocale) : undefined,
          isEnabled: isEnabledDirty ? isEnabled : undefined,
        });
        toast.success(tToast('saved'));
        onSaved?.();
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          toast.error(err.message);
        } else {
          toast.error(err instanceof Error ? err.message : tToast('saveFailed'));
        }
        return false;
      }
    };

    const handleReset = async (): Promise<boolean> => {
      if (!template.is_customized) {
        onSaved?.();
        return true;
      }
      try {
        await resetMutation.mutateAsync(template.trigger);
        toast.success(tToast('reset'));
        onSaved?.();
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tToast('resetFailed'));
        return false;
      }
    };

    const isPending = updateMutation.isPending || resetMutation.isPending;
    const isCustomized = template.is_customized === true;

    useImperativeHandle(
      ref,
      () => ({
        save: handleSave,
        reset: handleReset,
        canSave,
        isPending,
        isUsingDefault,
        isCustomized,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [canSave, isPending, isUsingDefault, isCustomized]
    );

    // Push state changes outward so the Sheet / wizard footer button states stay live.
    useEffect(() => {
      onStateChange?.({ canSave, isPending, isUsingDefault, isCustomized });
    }, [canSave, isPending, isUsingDefault, isCustomized, onStateChange]);

    const previewBody = renderSamplePreview(currentBody);

    return (
      <div className="space-y-4">
        {isUsingDefault && <InfoBox variant="note" message={t('plan.starterUsingDefault')} />}

        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-foreground">
              {isEnabled ? t('editor.enabled') : t('editor.disabled')}
            </div>
            {!isEnabled && (
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {t('editor.disabledHint')}
              </p>
            )}
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
            aria-label={t('editor.enabled')}
          />
        </div>

        <div
          className={cn(
            'space-y-4 transition-opacity',
            (!isEnabled || isUsingDefault) && 'opacity-50 pointer-events-none'
          )}
          aria-hidden={!isEnabled || isUsingDefault}
        >
          <LocaleTabs value={locale} onValueChange={setLocale} primaryLocale={primaryLocale} />

          <LocaleBodyField
            key={locale}
            locale={locale}
            value={bodyByLocale[locale]}
            placeholder={defaultBody[locale] ?? ''}
            onChange={(next) => setBodyByLocale((prev) => ({ ...prev, [locale]: next }))}
            onReset={() => resetLocaleBody(locale)}
            editorRef={editorRef}
          />

          <VariableChips
            variables={insertableVariables as unknown as VariableKey[]}
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
        </div>

        {usesCustomerName && !isUsingDefault && (
          <InfoBox variant="warning" message={t('editor.nameWarning')} />
        )}

        <div className={cn('pt-2 transition-opacity', !isEnabled && 'opacity-40')}>
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
                  body={renderSamplePreview(currentBody, { customer_first_name: '' })}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

interface LocaleBodyFieldProps {
  locale: Locale;
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
  onReset: () => void;
  editorRef: React.Ref<VariableEditorHandle>;
}

function LocaleBodyField({
  locale,
  value,
  placeholder,
  onChange,
  onReset,
  editorRef,
}: LocaleBodyFieldProps) {
  const t = useTranslations('notifications');
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">{t('editor.bodyLabel')}</Label>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowCounterClockwiseIcon className="h-3 w-3" />
          {t('editor.resetLocale')}
        </button>
      </div>
      <VariableEditor
        ref={editorRef}
        value={value}
        onChange={onChange}
        locale={locale}
        placeholder={placeholder}
        ariaLabel={t('editor.bodyLabel')}
      />
    </div>
  );
}
