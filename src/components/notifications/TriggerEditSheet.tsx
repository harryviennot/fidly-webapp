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
import { LocaleTabs } from './LocaleTabs';
import { VariableChips } from './VariableChips';
import { MessagePreview } from './MessagePreview';
import {
  VariableEditor,
  type VariableEditorHandle,
} from './VariableEditor';
import type { NotificationTemplate, Locale } from '@/types/notification';

interface TriggerEditSheetProps {
  template: NotificationTemplate | null;
  onClose: () => void;
  /** Default template body (un-customized) — used by the reset action. */
  defaultBody: Record<Locale, string>;
  /** Loyalty program name, shown as the title in the preview. */
  programName?: string | null;
}

export function TriggerEditSheet({
  template,
  onClose,
  defaultBody,
  programName,
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
}

function EditForm({
  template,
  onClose,
  defaultBody,
  programName,
}: Readonly<EditFormProps>) {
  const t = useTranslations('notifications');
  const tToast = useTranslations('notifications.toasts');
  const { currentBusiness } = useBusiness();
  const updateMutation = useUpdateNotificationTemplate(currentBusiness?.id);
  const resetMutation = useResetNotificationTemplate(currentBusiness?.id);

  const primaryLocale: Locale = currentBusiness?.primary_locale ?? 'fr';

  const [locale, setLocale] = useState<Locale>(primaryLocale);
  const [bodyByLocale, setBodyByLocale] = useState<Record<Locale, string>>({
    en: template.body.en ?? '',
    fr: template.body.fr ?? '',
  });
  const editorRef = useRef<VariableEditorHandle>(null);

  // Show every known variable as an insertable chip — no parity check.
  const insertableVariables = VARIABLE_KEYS as readonly VariableKey[];

  const currentBody = bodyByLocale[locale];
  const primaryBody = bodyByLocale[primaryLocale];
  // Valid as long as the primary locale is non-empty; secondary locales
  // are optional — empty ones fall back to the system default at send time.
  const isValid = primaryBody.trim().length > 0;

  const insertVariable = (key: VariableKey) => {
    editorRef.current?.insertVariable(key);
  };

  const resetLocaleBody = (loc: Locale) => {
    setBodyByLocale((prev) => ({ ...prev, [loc]: defaultBody[loc] ?? '' }));
  };

  const handleSave = async () => {
    const payload: Record<Locale, string> = {
      en: bodyByLocale.en,
      fr: bodyByLocale.fr,
    };
    try {
      await updateMutation.mutateAsync({
        trigger: template.trigger,
        body: payload,
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
        />

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
        <div className="flex w-full items-center justify-between gap-2">
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
              disabled={!isValid || updateMutation.isPending}
            >
              <FloppyDiskIcon className="h-3.5 w-3.5" />
              {updateMutation.isPending ? '...' : t('editor.save')}
            </Button>
          </div>
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
