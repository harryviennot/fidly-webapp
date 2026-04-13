'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowCounterClockwise, FloppyDisk, WarningIcon } from '@phosphor-icons/react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { InfoBox } from '@/components/reusables/info-box';
import { useBusiness } from '@/contexts/business-context';
import {
  useUpdateNotificationTemplate,
  useResetNotificationTemplate,
} from '@/hooks/use-notifications';
import {
  extractVariables,
  renderSamplePreview,
  validateTemplateVariables,
} from '@/lib/template-variables';
import { ApiError } from '@/api/client';
import { LocaleTabs } from './LocaleTabs';
import { VariableChips, type VariableKey } from './VariableChips';
import { MessagePreview } from './MessagePreview';
import type {
  NotificationTemplate,
  Locale,
  TriggerType,
} from '@/types/notification';

interface TriggerEditSheetProps {
  /** Controlled — the template currently being edited, or null if sheet is closed. */
  template: NotificationTemplate | null;
  /** Called when the sheet should close (user clicked away, saved, or cancelled). */
  onClose: () => void;
  /** Default template body (un-customized) — used as the source of truth for
   *  the variable validator and the reset action. */
  defaultBody: Record<Locale, string>;
}

export function TriggerEditSheet({
  template,
  onClose,
  defaultBody,
}: Readonly<TriggerEditSheetProps>) {
  return (
    <Sheet open={!!template} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[520px] w-full flex flex-col">
        {template && (
          // Remount the form whenever a different trigger is opened so its
          // internal useState initializer re-runs with the new defaults.
          <EditForm
            key={template.trigger}
            template={template}
            onClose={onClose}
            defaultBody={defaultBody}
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
}

function EditForm({ template, onClose, defaultBody }: Readonly<EditFormProps>) {
  const t = useTranslations('notifications');
  const tToast = useTranslations('notifications.toasts');
  const { currentBusiness } = useBusiness();
  const updateMutation = useUpdateNotificationTemplate(currentBusiness?.id);
  const resetMutation = useResetNotificationTemplate(currentBusiness?.id);

  const [locale, setLocale] = useState<Locale>('en');
  const [bodyByLocale, setBodyByLocale] = useState<Record<Locale, string>>({
    en: template.body.en ?? '',
    fr: template.body.fr ?? '',
  });
  const enTextareaRef = useRef<HTMLTextAreaElement>(null);
  const frTextareaRef = useRef<HTMLTextAreaElement>(null);

  // The variables that MUST appear in each locale body, derived from the
  // English default. Backend rejects bodies that add or remove variables.
  const requiredVariables = Array.from(extractVariables(defaultBody.en)) as VariableKey[];

  // Per-locale validation errors (missing/extra variables)
  const enValidation = validateTemplateVariables(bodyByLocale.en, defaultBody.en);
  const frValidation = validateTemplateVariables(bodyByLocale.fr, defaultBody.en);

  const missingLocales: Locale[] = [];
  if (enValidation.missing.length || enValidation.extra.length) missingLocales.push('en');
  if (frValidation.missing.length || frValidation.extra.length) missingLocales.push('fr');

  const currentValidation = locale === 'en' ? enValidation : frValidation;
  const isValid = missingLocales.length === 0 && bodyByLocale.en.trim() && bodyByLocale.fr.trim();

  const insertVariable = (variable: string) => {
    const ref = locale === 'en' ? enTextareaRef.current : frTextareaRef.current;
    if (!ref) return;
    const start = ref.selectionStart;
    const end = ref.selectionEnd;
    const current = bodyByLocale[locale];
    const next = current.substring(0, start) + variable + current.substring(end);
    setBodyByLocale({ ...bodyByLocale, [locale]: next });
    // Restore cursor after the insertion
    setTimeout(() => {
      ref.focus();
      ref.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        trigger: template.trigger as TriggerType,
        body: bodyByLocale,
      });
      toast.success(tToast('saved'));
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_TEMPLATE_VARIABLES') {
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
      await resetMutation.mutateAsync(template.trigger as TriggerType);
      toast.success(tToast('reset'));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tToast('resetFailed'));
    }
  };

  const previewBody = renderSamplePreview(bodyByLocale[locale]);

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
        <LocaleTabs
          value={locale}
          onValueChange={setLocale}
          missingLocales={missingLocales}
          enContent={
            <div className="space-y-2">
              <Label htmlFor="en-body" className="text-xs text-muted-foreground">
                {t('editor.bodyLabel')} (EN)
              </Label>
              <Textarea
                id="en-body"
                ref={enTextareaRef}
                value={bodyByLocale.en}
                onChange={(e) =>
                  setBodyByLocale({ ...bodyByLocale, en: e.target.value })
                }
                className="min-h-[100px] resize-none text-sm"
                placeholder={defaultBody.en}
              />
            </div>
          }
          frContent={
            <div className="space-y-2">
              <Label htmlFor="fr-body" className="text-xs text-muted-foreground">
                {t('editor.bodyLabel')} (FR)
              </Label>
              <Textarea
                id="fr-body"
                ref={frTextareaRef}
                value={bodyByLocale.fr}
                onChange={(e) =>
                  setBodyByLocale({ ...bodyByLocale, fr: e.target.value })
                }
                className="min-h-[100px] resize-none text-sm"
                placeholder={defaultBody.fr}
              />
            </div>
          }
        />

        {requiredVariables.length > 0 && (
          <VariableChips
            variables={requiredVariables}
            onInsert={insertVariable}
          />
        )}

        {(currentValidation.missing.length > 0 ||
          currentValidation.extra.length > 0) && (
          <InfoBox
            variant="warning"
            icon={<WarningIcon className="h-4 w-4" weight="fill" />}
            title={
              currentValidation.missing.length > 0
                ? t('editor.validation.missingVariable', {
                    variable: currentValidation.missing
                      .map((v) => `{{${v}}}`)
                      .join(', '),
                  })
                : `Unexpected variable: ${currentValidation.extra
                    .map((v) => `{{${v}}}`)
                    .join(', ')}`
            }
            message=""
          />
        )}

        <div className="pt-2">
          <Label className="text-xs text-muted-foreground mb-2 block">
            {t('editor.previewLabel')}
          </Label>
          <div className="flex justify-center">
            <MessagePreview
              iconUrl={currentBusiness?.icon_url ?? null}
              businessName={currentBusiness?.name ?? ''}
              body={previewBody}
            />
          </div>
        </div>
      </div>

      <SheetFooter className="border-t border-border pt-4">
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetMutation.isPending || updateMutation.isPending}
          >
            <ArrowCounterClockwise className="h-3.5 w-3.5" />
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
              disabled={!isValid || updateMutation.isPending}
            >
              <FloppyDisk className="h-3.5 w-3.5" />
              {updateMutation.isPending ? '...' : t('editor.save')}
            </Button>
          </div>
        </div>
      </SheetFooter>
    </>
  );
}
