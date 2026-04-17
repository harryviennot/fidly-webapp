'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  ArrowCounterClockwiseIcon,
  FloppyDiskIcon,
} from '@phosphor-icons/react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/contexts/business-context';
import {
  useUpdateNotificationTemplate,
  useResetNotificationTemplate,
} from '@/hooks/use-notifications';
import {
  renderSamplePreview,
  VARIABLE_KEYS,
  type VariableKey,
} from '@/lib/template-variables';
import { ApiError } from '@/api/client';
import { InfoBox } from '@/components/reusables/info-box';
import { LocaleTabs } from './LocaleTabs';
import { VariableChips } from './VariableChips';
import { MessagePreview } from './MessagePreview';
import {
  VariableEditor,
  type VariableEditorHandle,
} from './VariableEditor';
import type { NotificationTemplate, Locale } from '@/types/notification';

/** Check whether the body references `{{customer_first_name}}` (canonical key). */
function bodyUsesCustomerName(body: Record<Locale, string>): boolean {
  return /\{\{customer_first_name\}\}/.test(body.en) || /\{\{customer_first_name\}\}/.test(body.fr);
}

interface TriggerEditSheetProps {
  template: NotificationTemplate | null;
  onClose: () => void;
  /** Default template body (un-customized) — used by the reset action. */
  defaultBody: Record<Locale, string>;
  /** Loyalty program name, shown as the title in the preview. */
  programName?: string | null;
  /** Whether the active program has a reward name set. Used to grey out
   *  the `{{reward_name}}` chip and surface a guidance tooltip. */
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
          <EditForm
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

interface EditFormProps {
  template: NotificationTemplate;
  onClose: () => void;
  defaultBody: Record<Locale, string>;
  programName?: string | null;
  rewardNameSet?: boolean;
}

function EditForm({
  template,
  onClose,
  defaultBody,
  programName,
  rewardNameSet,
}: Readonly<EditFormProps>) {
  const t = useTranslations('notifications');
  const tToast = useTranslations('notifications.toasts');
  const { currentBusiness } = useBusiness();
  const updateMutation = useUpdateNotificationTemplate(currentBusiness?.id);
  const resetMutation = useResetNotificationTemplate(currentBusiness?.id);

  const primaryLocale: Locale = currentBusiness?.primary_locale ?? 'fr';
  const isUsingDefault = template.is_using_default === true;

  const [locale, setLocale] = useState<Locale>(primaryLocale);
  const [bodyByLocale, setBodyByLocale] = useState<Record<Locale, string>>({
    en: template.body.en ?? '',
    fr: template.body.fr ?? '',
  });
  const [isEnabled, setIsEnabled] = useState<boolean>(
    template.is_enabled !== false
  );
  const editorRef = useRef<VariableEditorHandle>(null);

  // Show every known variable as an insertable chip — no parity check.
  const insertableVariables = VARIABLE_KEYS as readonly VariableKey[];

  // Build the set of disabled variables based on program configuration.
  const collectName = currentBusiness?.settings?.customer_data_collection?.collect_name;
  const isNameCollectionOff = collectName === 'off' || collectName === false;
  const disabledVars = new Set<VariableKey>();
  if (!rewardNameSet) disabledVars.add('reward_name');
  if (isNameCollectionOff) disabledVars.add('customer_first_name');
  const usesCustomerName = bodyUsesCustomerName(bodyByLocale);

  const currentBody = bodyByLocale[locale];
  const primaryBody = bodyByLocale[primaryLocale];

  // Did the user touch the body since load? Starter businesses can't, so
  // on Starter this is always false and we send an is_enabled-only payload.
  // Also blocked when is_using_default (Starter with custom content paused).
  const isBodyDirty =
    !isUsingDefault &&
    (bodyByLocale.en !== (template.body.en ?? '') ||
    bodyByLocale.fr !== (template.body.fr ?? ''));
  const isEnabledDirty = isEnabled !== (template.is_enabled !== false);

  // Save is enabled whenever something has actually changed AND, when the
  // body has been touched, the primary locale still has content. Pure
  // opt-out toggles (is_enabled only) save even if the body is empty.
  const canSave =
    (isBodyDirty || isEnabledDirty) &&
    (!isBodyDirty || primaryBody.trim().length > 0);

  const insertVariable = (key: VariableKey) => {
    editorRef.current?.insertVariable(key);
  };

  const resetLocaleBody = (loc: Locale) => {
    setBodyByLocale((prev) => ({ ...prev, [loc]: defaultBody[loc] ?? '' }));
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        trigger: template.trigger,
        // Only include `body` if the user actually edited it. A pure
        // toggle flow sends only `isEnabled` so the backend skips its
        // plan gate and the request succeeds on Starter.
        body: isBodyDirty
          ? { en: bodyByLocale.en, fr: bodyByLocale.fr }
          : undefined,
        isEnabled: isEnabledDirty ? isEnabled : undefined,
      });
      toast.success(tToast('saved'));
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(err instanceof Error ? err.message : tToast('saveFailed'));
      }
    }
  };

  const handleReset = async () => {
    if (!template.is_customized) {
      onClose();
      return;
    }
    try {
      await resetMutation.mutateAsync(template.trigger);
      toast.success(tToast('reset'));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tToast('resetFailed'));
    }
  };

  const previewBody = renderSamplePreview(currentBody);

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {t('editor.editTitle')}: {t(`triggers.${template.trigger}.name`)}
        </SheetTitle>
        <SheetDescription>
          {t(`triggers.${template.trigger}.description`)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-4">
        {/* Starter using-default banner */}
        {isUsingDefault && (
          <InfoBox
            variant="note"
            message={t('plan.starterUsingDefault')}
          />
        )}

        {/* Enable/disable row — sits at the top of the scrollable area so it
            doesn't collide with the Sheet's built-in close button. Always
            interactive, even on Starter where the body editor is read-only. */}
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
          <LocaleTabs
            value={locale}
            onValueChange={setLocale}
            primaryLocale={primaryLocale}
          />

          <LocaleBodyField
            key={locale}
            locale={locale}
            value={bodyByLocale[locale]}
            placeholder={defaultBody[locale] ?? ''}
            onChange={(next) =>
              setBodyByLocale((prev) => ({ ...prev, [locale]: next }))
            }
            onReset={() => resetLocaleBody(locale)}
            editorRef={editorRef}
            t={t}
          />

          <VariableChips
            variables={insertableVariables as unknown as VariableKey[]}
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
        </div>

        {/* Warning when body uses customer_first_name */}
        {usesCustomerName && !isUsingDefault && (
          <InfoBox
            variant="warning"
            message={t('editor.nameWarning')}
          />
        )}

        <div
          className={cn(
            'pt-2 transition-opacity',
            !isEnabled && 'opacity-40'
          )}
        >
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
          {/* Second preview without customer name */}
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

      <SheetFooter className="border-t border-border pt-4">
        <div className="flex w-full items-center justify-between gap-2">
          {isUsingDefault ? (
            <>
              <div />
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t('editor.cancel')}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={resetMutation.isPending || updateMutation.isPending}
              >
                <ArrowCounterClockwiseIcon className="h-3.5 w-3.5" />
                {t('editor.reset')}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={updateMutation.isPending}
                >
                  {t('editor.cancel')}
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={handleSave}
                  disabled={!canSave || updateMutation.isPending}
                >
                  <FloppyDiskIcon className="h-3.5 w-3.5" />
                  {updateMutation.isPending ? '...' : t('editor.save')}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetFooter>
    </>
  );
}

interface LocaleBodyFieldProps {
  locale: Locale;
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
  onReset: () => void;
  editorRef: React.Ref<VariableEditorHandle>;
  t: ReturnType<typeof useTranslations>;
}

function LocaleBodyField({
  locale,
  value,
  placeholder,
  onChange,
  onReset,
  editorRef,
  t,
}: Readonly<LocaleBodyFieldProps>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">
          {t('editor.bodyLabel')}
        </Label>
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
