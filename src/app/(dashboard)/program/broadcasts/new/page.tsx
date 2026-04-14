'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CaretLeftIcon,
  CheckCircleIcon,
  FloppyDiskIcon,
  MegaphoneIcon,
  PaperPlaneRightIcon,
  UsersIcon,
  ClockIcon,
  FunnelIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { InfoBox } from '@/components/reusables/info-box';
import { LoadingSpinner } from '@/components/reusables/loading-spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBusiness } from '@/contexts/business-context';
import { useEntitlements } from '@/hooks/useEntitlements';
import {
  useBroadcast,
  useCreateBroadcast,
  useUpdateBroadcast,
  useRecipientEstimate,
  useSendBroadcast,
} from '@/hooks/use-notifications';
import { ApiError } from '@/api/client';
import { cn } from '@/lib/utils';
import { describeFilter } from '@/lib/broadcast-filters';
import { MessagePreview, PlanGatedField } from '@/components/notifications';
import type {
  Broadcast,
  BroadcastTargetFilter,
  BroadcastTranslations,
  Locale,
} from '@/types/notification';

// ─────────────────────────────────────────────────────────────────────
// Types + constants
// ─────────────────────────────────────────────────────────────────────

type StepKey = 'compose' | 'audience' | 'schedule' | 'review';
type SendMode = 'now' | 'schedule';

const STEPS: StepKey[] = ['compose', 'audience', 'schedule', 'review'];
const BODY_CHAR_LIMIT = 120;

const SCHEDULE_HOUR_MIN = 9;
const SCHEDULE_HOUR_MAX = 20; // exclusive on the backend (last = 19:xx)

interface WizardState {
  title: string;
  body: string;
  /** Optional secondary-locale translation (nullable when not added yet). */
  translation: { title: string; body: string } | null;
  targetFilter: BroadcastTargetFilter;
  sendMode: SendMode | null;
  scheduledAt: Date | null;
}

const EMPTY_STATE: WizardState = {
  title: '',
  body: '',
  translation: null,
  targetFilter: { all: true },
  sendMode: null,
  scheduledAt: null,
};

// ─────────────────────────────────────────────────────────────────────
// Page entry — handles URL edit mode + loading
// ─────────────────────────────────────────────────────────────────────

export default function NewBroadcastPage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { currentBusiness } = useBusiness();
  const { data: existing, isLoading: editLoading } = useBroadcast(
    currentBusiness?.id,
    editId ?? undefined
  );

  // Edit mode is only valid for draft / scheduled — anything else bounces.
  const router = useRouter();
  useEffect(() => {
    if (!editId || !existing) return;
    if (existing.status !== 'draft' && existing.status !== 'scheduled') {
      toast.error('This broadcast can no longer be edited.');
      router.replace('/program/broadcasts');
    }
  }, [editId, existing, router]);

  if (editId && editLoading) {
    return <LoadingSpinner className="py-24" />;
  }
  if (editId && !existing) {
    return <LoadingSpinner className="py-24" />;
  }

  return (
    <BroadcastWizard
      key={editId ?? 'new'}
      editId={editId}
      existing={existing ?? null}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────
// Wizard shell
// ─────────────────────────────────────────────────────────────────────

interface BroadcastWizardProps {
  editId: string | null;
  existing: Broadcast | null;
}

function BroadcastWizard({ editId, existing }: Readonly<BroadcastWizardProps>) {
  const t = useTranslations('notifications.broadcasts');
  const tWizard = useTranslations('notifications.broadcasts.wizard');
  const tToast = useTranslations('notifications.broadcasts.toasts');
  const tErrors = useTranslations('notifications.broadcasts.errors');
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const { hasFeature } = useEntitlements();

  const canSchedule = hasFeature('notifications.scheduled');
  const canSegment = hasFeature('notifications.segmentation');
  const primaryLocale: Locale = currentBusiness?.primary_locale ?? 'fr';
  const secondaryLocale: Locale = primaryLocale === 'fr' ? 'en' : 'fr';
  const businessTimezone =
    (currentBusiness as unknown as { timezone?: string })?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ─── Initial state ───
  const initialState = useMemo<WizardState>(() => {
    if (existing) {
      const translationEntry =
        (existing.translations as BroadcastTranslations | undefined)?.[
          secondaryLocale
        ] ?? null;
      return {
        title: existing.title ?? '',
        body: existing.body ?? '',
        translation: translationEntry ?? null,
        targetFilter: existing.target_filter ?? { all: true },
        sendMode: existing.scheduled_at ? 'schedule' : null,
        scheduledAt: existing.scheduled_at
          ? new Date(existing.scheduled_at)
          : null,
      };
    }
    return EMPTY_STATE;
  }, [existing, secondaryLocale]);

  const [state, setState] = useState<WizardState>(initialState);
  const [currentStep, setCurrentStep] = useState<StepKey>('compose');
  const [confirmSend, setConfirmSend] = useState(false);

  const createMutation = useCreateBroadcast(currentBusiness?.id);
  const updateMutation = useUpdateBroadcast(currentBusiness?.id);
  const sendMutation = useSendBroadcast(currentBusiness?.id);
  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    sendMutation.isPending;

  const currentIndex = STEPS.indexOf(currentStep);
  const isLastStep = currentIndex === STEPS.length - 1;

  // ─── Step validation ───
  // `nowRef` freezes the "is this in the future" reference at every user
  // interaction. Re-computed at render time keeps the impurity rule happy
  // (the value is stable within a render pass).
  const renderTs = useRenderTimestamp([currentStep, state]);
  const canAdvance = useMemo(() => {
    if (currentStep === 'compose') {
      return state.title.trim().length > 0 && state.body.trim().length > 0;
    }
    if (currentStep === 'schedule') {
      if (state.sendMode === 'now') return true;
      if (state.sendMode === 'schedule') {
        return isScheduleValid(state.scheduledAt, renderTs);
      }
      return false;
    }
    return true;
  }, [currentStep, state, renderTs]);

  // ─── Build payload for save ───
  const buildPayload = (includeSendMode: boolean) => {
    const translations: BroadcastTranslations = {};
    if (state.translation) {
      translations[secondaryLocale] = state.translation;
    }

    const payload: {
      title: string;
      body: string;
      translations?: BroadcastTranslations;
      target_filter: BroadcastTargetFilter;
      scheduled_at?: string | null;
      immediate?: boolean;
    } = {
      title: state.title.trim(),
      body: state.body.trim(),
      target_filter: state.targetFilter,
    };

    if (state.translation) {
      payload.translations = translations;
    }

    if (includeSendMode) {
      if (state.sendMode === 'schedule' && state.scheduledAt) {
        payload.scheduled_at = state.scheduledAt.toISOString();
      } else if (state.sendMode === 'now') {
        payload.immediate = true;
      }
    }

    return payload;
  };

  // ─── Actions ───
  const handleSaveDraft = async () => {
    try {
      const payload = buildPayload(false);
      if (editId) {
        await updateMutation.mutateAsync({
          id: editId,
          payload: {
            ...payload,
            scheduled_at: null, // back to draft
          },
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(tToast('draftSaved'));
      router.push('/program/broadcasts');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : tToast('draftSaveFailed')
      );
    }
  };

  const handleFinalSubmit = async () => {
    setConfirmSend(false);
    try {
      if (editId && existing) {
        // Edit mode: PATCH with schedule or send via /send
        if (state.sendMode === 'schedule') {
          await updateMutation.mutateAsync({
            id: editId,
            payload: {
              title: state.title.trim(),
              body: state.body.trim(),
              translations: state.translation
                ? { [secondaryLocale]: state.translation }
                : {},
              target_filter: state.targetFilter,
              scheduled_at: state.scheduledAt!.toISOString(),
            },
          });
          toast.success(tToast('scheduled'));
        } else if (state.sendMode === 'now') {
          // First PATCH any content changes, then fire /send
          await updateMutation.mutateAsync({
            id: editId,
            payload: {
              title: state.title.trim(),
              body: state.body.trim(),
              translations: state.translation
                ? { [secondaryLocale]: state.translation }
                : {},
              target_filter: state.targetFilter,
              scheduled_at: null,
            },
          });
          await sendMutation.mutateAsync(editId);
          toast.success(tToast('sent'));
        }
      } else {
        // Create mode: single POST with immediate / scheduled_at
        await createMutation.mutateAsync(buildPayload(true));
        toast.success(
          state.sendMode === 'now' ? tToast('sent') : tToast('scheduled')
        );
      }
      router.push('/program/broadcasts');
    } catch (err) {
      handleMutationError(err);
    }
  };

  const handleMutationError = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.code === 'UPGRADE_REQUIRED') {
        toast.error(tErrors('upgradeRequired'));
        return;
      }
      if (err.code === 'QUOTA_EXCEEDED') {
        toast.error(tErrors('quotaExceeded'));
        return;
      }
      if (err.code === 'SCHEDULE_OUT_OF_WINDOW') {
        toast.error(err.message || tErrors('scheduleOutOfWindow'));
        return;
      }
    }
    toast.error(err instanceof Error ? err.message : tToast('sendFailed'));
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      router.push('/program/broadcasts');
    } else {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      setConfirmSend(true);
    } else {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  // ─── Render ───
  return (
    <div
      className="flex flex-col gap-[14px] animate-slide-up"
      style={{ animationDelay: '150ms' }}
    >
      {/* Header with back + step indicator */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push('/program/broadcasts')}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors"
        >
          <CaretLeftIcon className="h-3.5 w-3.5" />
          {t('page.title')}
        </button>
        <div className="text-[11px] text-[#A0A0A0] font-medium">
          {tWizard('stepIndicator', {
            current: currentIndex + 1,
            total: STEPS.length,
          })}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((step, i) => {
          const isActive = i === currentIndex;
          const isPast = i < currentIndex;
          return (
            <div
              key={step}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                isActive
                  ? 'bg-[var(--accent)]'
                  : isPast
                  ? 'bg-[var(--accent)]/60'
                  : 'bg-[var(--border-light)]'
              )}
            />
          );
        })}
      </div>

      {/* Step content */}
      <div className="flex gap-[14px] flex-col min-[1080px]:flex-row min-[1080px]:items-start">
        <div className="flex-1 min-w-0">
          {currentStep === 'compose' && (
            <ComposeStep
              state={state}
              setState={setState}
              primaryLocale={primaryLocale}
              secondaryLocale={secondaryLocale}
            />
          )}
          {currentStep === 'audience' && (
            <AudienceStep
              state={state}
              setState={setState}
              canSegment={canSegment}
            />
          )}
          {currentStep === 'schedule' && (
            <ScheduleStep
              state={state}
              setState={setState}
              canSchedule={canSchedule}
              businessTimezone={businessTimezone}
            />
          )}
          {currentStep === 'review' && (
            <ReviewStep
              state={state}
              businessTimezone={businessTimezone}
            />
          )}
        </div>

        {/* Right sidebar — persistent live preview */}
        <div
          className="hidden min-[1080px]:flex w-[290px] min-w-[290px] flex-shrink-0 flex-col"
          style={{ animationDelay: '350ms' }}
        >
          <div className="min-[1080px]:sticky min-[1080px]:top-5 flex flex-col gap-[14px]">
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px]">
              <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-3">
                {t('wizard.review.summaryTitle')}
              </div>
              <MessagePreview
                iconUrl={currentBusiness?.icon_url ?? null}
                businessName={currentBusiness?.name ?? ''}
                body={state.body || state.title}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--border-light)]">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={isBusy}
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          {currentIndex === 0 ? tWizard('cancel') : tWizard('back')}
        </Button>

        <div className="flex items-center gap-2">
          {state.title.trim() && state.body.trim() && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isBusy}
            >
              <FloppyDiskIcon className="h-3.5 w-3.5" />
              {tWizard('saveDraft')}
            </Button>
          )}
          {isLastStep ? (
            <Button
              variant="gradient"
              size="sm"
              onClick={handleNext}
              disabled={!canAdvance || isBusy || !state.sendMode}
            >
              {state.sendMode === 'schedule' ? (
                <>
                  <ClockIcon className="h-3.5 w-3.5" />
                  {t('wizard.review.scheduleButton')}
                </>
              ) : (
                <>
                  <PaperPlaneRightIcon className="h-3.5 w-3.5" />
                  {t('wizard.review.sendButton')}
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="gradient"
              size="sm"
              onClick={handleNext}
              disabled={!canAdvance || isBusy}
            >
              {tWizard('next')}
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <AlertDialog
        open={confirmSend}
        onOpenChange={(open) => !open && setConfirmSend(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('wizard.review.confirmSend', { count: '?' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {state.sendMode === 'now'
                ? t('wizard.review.sendButton')
                : t('wizard.review.scheduleButton')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>
              {tWizard('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalSubmit} disabled={isBusy}>
              {state.sendMode === 'now'
                ? t('wizard.review.sendButton')
                : t('wizard.review.scheduleButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step 1 — Compose
// ─────────────────────────────────────────────────────────────────────

interface ComposeStepProps {
  state: WizardState;
  setState: (updater: (prev: WizardState) => WizardState) => void;
  primaryLocale: Locale;
  secondaryLocale: Locale;
}

function ComposeStep({
  state,
  setState,
  primaryLocale,
  secondaryLocale,
}: Readonly<ComposeStepProps>) {
  const t = useTranslations('notifications.broadcasts.wizard.compose');
  const hasTranslation = state.translation !== null;

  const localeLabel = (loc: Locale) =>
    loc === 'fr' ? 'Français 🇫🇷' : 'English 🇬🇧';

  return (
    <div
      className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
      style={{ animationDelay: '60ms' }}
    >
      <div className="text-[16px] font-semibold text-[#1A1A1A] mb-1">
        {t('title')}
      </div>
      <div className="text-[12px] text-[#A0A0A0] mb-5">{t('subtitle')}</div>

      {/* Primary locale fields */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wide">
          {localeLabel(primaryLocale)}
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#555] mb-1.5">
            {t('titleLabel')}
          </Label>
          <Input
            value={state.title}
            onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
            placeholder={t('titlePlaceholder')}
          />
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#555] mb-1.5 flex items-center justify-between">
            <span>{t('bodyLabel')}</span>
            <span
              className={cn(
                'text-[11px] font-normal tabular-nums',
                state.body.length > BODY_CHAR_LIMIT
                  ? 'text-[var(--warning)]'
                  : 'text-[#A0A0A0]'
              )}
            >
              {t('charCount', { count: state.body.length, max: BODY_CHAR_LIMIT })}
            </span>
          </Label>
          <Textarea
            value={state.body}
            onChange={(e) => setState((s) => ({ ...s, body: e.target.value }))}
            placeholder={t('bodyPlaceholder')}
            className="min-h-[100px] resize-none"
          />
        </div>
      </div>

      {/* Translation toggle */}
      <div className="mt-5 pt-4 border-t border-[var(--border-light)]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[#1A1A1A]">
              {localeLabel(secondaryLocale)}
            </div>
            <p className="text-[11px] text-[#A0A0A0] mt-0.5 leading-[1.4]">
              Optional translation — customers see the language matching their phone.
            </p>
          </div>
          <Switch
            checked={hasTranslation}
            onCheckedChange={(checked) =>
              setState((s) => ({
                ...s,
                translation: checked ? { title: '', body: '' } : null,
              }))
            }
          />
        </div>

        {hasTranslation && state.translation && (
          <div className="space-y-4">
            <div>
              <Label className="text-[12px] font-semibold text-[#555] mb-1.5">
                {t('titleLabel')}
              </Label>
              <Input
                value={state.translation.title}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    translation: s.translation
                      ? { ...s.translation, title: e.target.value }
                      : null,
                  }))
                }
                placeholder={t('titlePlaceholder')}
              />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#555] mb-1.5">
                {t('bodyLabel')}
              </Label>
              <Textarea
                value={state.translation.body}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    translation: s.translation
                      ? { ...s.translation, body: e.target.value }
                      : null,
                  }))
                }
                placeholder={t('bodyPlaceholder')}
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step 2 — Audience
// ─────────────────────────────────────────────────────────────────────

interface AudienceStepProps {
  state: WizardState;
  setState: (updater: (prev: WizardState) => WizardState) => void;
  canSegment: boolean;
}

function AudienceStep({
  state,
  setState,
  canSegment,
}: Readonly<AudienceStepProps>) {
  const t = useTranslations('notifications.broadcasts.wizard.audience');
  const { currentBusiness } = useBusiness();

  const isAll = !!state.targetFilter.all;

  const setAll = (on: boolean) => {
    setState((s) => ({
      ...s,
      targetFilter: on ? { all: true } : {},
    }));
  };

  const { data: estimate, isFetching: estimating } = useRecipientEstimate(
    currentBusiness?.id,
    state.targetFilter,
    true
  );

  const updateFilter = <K extends keyof BroadcastTargetFilter>(
    key: K,
    value: BroadcastTargetFilter[K]
  ) => {
    setState((s) => {
      const next = { ...s.targetFilter };
      delete next.all;
      if (value === undefined || value === null) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return { ...s, targetFilter: next };
    });
  };

  return (
    <div
      className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
      style={{ animationDelay: '60ms' }}
    >
      <div className="text-[16px] font-semibold text-[#1A1A1A] mb-1">
        {t('title')}
      </div>
      <div className="text-[12px] text-[#A0A0A0] mb-5">{t('subtitle')}</div>

      {/* Radio cards */}
      <div className="flex gap-2 mb-5 flex-col sm:flex-row">
        <button
          type="button"
          onClick={() => setAll(true)}
          className={cn(
            'flex-1 p-4 rounded-[10px] text-left border-[1.5px] transition-all',
            isAll
              ? 'border-[var(--accent)] bg-[var(--accent-light)]'
              : 'border-[var(--border-light)] bg-[var(--paper)] hover:border-[var(--border)]'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <UsersIcon
              className="h-4 w-4 text-[var(--accent)]"
              weight="fill"
            />
            <span className="text-[13px] font-semibold text-[#1A1A1A]">
              {t('all')}
            </span>
          </div>
          <p className="text-[11px] text-[#8A8A8A] leading-[1.4]">
            {t('allDescription')}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setAll(false)}
          className={cn(
            'flex-1 p-4 rounded-[10px] text-left border-[1.5px] transition-all',
            !isAll
              ? 'border-[var(--accent)] bg-[var(--accent-light)]'
              : 'border-[var(--border-light)] bg-[var(--paper)] hover:border-[var(--border)]'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <FunnelIcon
              className="h-4 w-4 text-[var(--accent)]"
              weight="fill"
            />
            <span className="text-[13px] font-semibold text-[#1A1A1A]">
              {t('filtered')}
            </span>
          </div>
          <p className="text-[11px] text-[#8A8A8A] leading-[1.4]">
            {t('filteredDescription')}
          </p>
        </button>
      </div>

      {/* Filter rows */}
      {!isAll && (
        <div className="space-y-3">
          <FilterRow
            label={t('filters.enrolled_before_days')}
            value={state.targetFilter.enrolled_before_days}
            onChange={(v) => updateFilter('enrolled_before_days', v)}
          />
          <FilterRow
            label={t('filters.enrolled_after_days')}
            value={state.targetFilter.enrolled_after_days}
            onChange={(v) => updateFilter('enrolled_after_days', v)}
          />

          <PlanGatedField requiredTier="pro" upgradeFrom="broadcasts.segmentation">
            <div className="space-y-3">
              <FilterRow
                label={t('filters.stamp_count_min')}
                value={state.targetFilter.stamp_count_min}
                onChange={(v) => updateFilter('stamp_count_min', v)}
                disabled={!canSegment}
              />
              <FilterRow
                label={t('filters.stamp_count_max')}
                value={state.targetFilter.stamp_count_max}
                onChange={(v) => updateFilter('stamp_count_max', v)}
                disabled={!canSegment}
              />
              <FilterBoolRow
                label={t('filters.has_redeemed')}
                value={!!state.targetFilter.has_redeemed}
                onChange={(v) =>
                  updateFilter('has_redeemed', v ? true : undefined)
                }
                disabled={!canSegment}
              />
              <FilterRow
                label={t('filters.inactive_days')}
                value={state.targetFilter.inactive_days}
                onChange={(v) => updateFilter('inactive_days', v)}
                disabled={!canSegment}
              />
            </div>
          </PlanGatedField>
        </div>
      )}

      {/* Estimate */}
      <div className="mt-5 pt-4 border-t border-[var(--border-light)] flex items-center gap-2">
        <UsersIcon
          className="h-4 w-4 text-[var(--accent)]"
          weight="fill"
        />
        <div className="text-[13px] text-[#555]">
          {estimating ? (
            <span className="text-[#A0A0A0]">{t('estimating')}</span>
          ) : (
            <span>
              {t('estimate', { count: estimate?.total ?? 0 })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface FilterRowProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
}

function FilterRow({ label, value, onChange, disabled }: Readonly<FilterRowProps>) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--paper)]">
      <Label className="flex-1 text-[12px] text-[#555]">{label}</Label>
      <Input
        type="number"
        min={0}
        disabled={disabled}
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? undefined : parseInt(raw, 10));
        }}
        className="w-[80px] h-8 text-sm"
      />
    </div>
  );
}

interface FilterBoolRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function FilterBoolRow({
  label,
  value,
  onChange,
  disabled,
}: Readonly<FilterBoolRowProps>) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-[var(--border-light)] bg-[var(--paper)]">
      <Label className="flex-1 text-[12px] text-[#555]">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step 3 — Schedule
// ─────────────────────────────────────────────────────────────────────

interface ScheduleStepProps {
  state: WizardState;
  setState: (updater: (prev: WizardState) => WizardState) => void;
  canSchedule: boolean;
  businessTimezone: string;
}

/**
 * Pure scheduling check. `now` must be passed in explicitly so callers
 * (e.g. useMemo) remain idempotent — we never call `Date.now()` inside
 * the function itself.
 */
function isScheduleValid(date: Date | null, now: number): boolean {
  if (!date) return false;
  if (date.getTime() < now) return false;
  const hour = date.getHours();
  return hour >= SCHEDULE_HOUR_MIN && hour < SCHEDULE_HOUR_MAX;
}

function ScheduleStep({
  state,
  setState,
  canSchedule,
  businessTimezone,
}: Readonly<ScheduleStepProps>) {
  const t = useTranslations('notifications.broadcasts.wizard.schedule');

  const setMode = (mode: SendMode) => {
    setState((s) => ({
      ...s,
      sendMode: mode,
      scheduledAt:
        mode === 'schedule' ? s.scheduledAt ?? defaultScheduleDate() : null,
    }));
  };

  const renderTs = useRenderTimestamp([state.sendMode, state.scheduledAt]);
  const scheduleError = useMemo(() => {
    if (state.sendMode !== 'schedule' || !state.scheduledAt) return null;
    if (state.scheduledAt.getTime() < renderTs) return t('pastError');
    const hour = state.scheduledAt.getHours();
    if (hour < SCHEDULE_HOUR_MIN || hour >= SCHEDULE_HOUR_MAX) {
      return t('windowError', { tz: businessTimezone });
    }
    return null;
  }, [state.sendMode, state.scheduledAt, businessTimezone, t, renderTs]);

  return (
    <div
      className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
      style={{ animationDelay: '60ms' }}
    >
      <div className="text-[16px] font-semibold text-[#1A1A1A] mb-1">
        {t('title')}
      </div>
      <div className="text-[12px] text-[#A0A0A0] mb-5">{t('subtitle')}</div>

      <div className="flex gap-2 flex-col sm:flex-row mb-5">
        <button
          type="button"
          onClick={() => setMode('now')}
          className={cn(
            'flex-1 p-4 rounded-[10px] text-left border-[1.5px] transition-all',
            state.sendMode === 'now'
              ? 'border-[var(--accent)] bg-[var(--accent-light)]'
              : 'border-[var(--border-light)] bg-[var(--paper)] hover:border-[var(--border)]'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <PaperPlaneRightIcon
              className="h-4 w-4 text-[var(--accent)]"
              weight="fill"
            />
            <span className="text-[13px] font-semibold text-[#1A1A1A]">
              {t('sendNow')}
            </span>
          </div>
          <p className="text-[11px] text-[#8A8A8A] leading-[1.4]">
            {t('sendNowDescription')}
          </p>
        </button>

        <PlanGatedField
          requiredTier="pro"
          upgradeFrom="broadcasts.scheduled"
          className="flex-1"
        >
          <button
            type="button"
            onClick={() => setMode('schedule')}
            disabled={!canSchedule}
            className={cn(
              'w-full p-4 rounded-[10px] text-left border-[1.5px] transition-all',
              state.sendMode === 'schedule'
                ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                : 'border-[var(--border-light)] bg-[var(--paper)] hover:border-[var(--border)]',
              !canSchedule && 'opacity-60'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <ClockIcon
                className="h-4 w-4 text-[var(--accent)]"
                weight="fill"
              />
              <span className="text-[13px] font-semibold text-[#1A1A1A]">
                {t('scheduleLater')}
              </span>
            </div>
            <p className="text-[11px] text-[#8A8A8A] leading-[1.4]">
              {t('scheduleLaterDescription')}
            </p>
          </button>
        </PlanGatedField>
      </div>

      {state.sendMode === 'schedule' && canSchedule && (
        <div className="space-y-3">
          <DateTimePicker
            value={state.scheduledAt}
            onChange={(next) =>
              setState((s) => ({ ...s, scheduledAt: next }))
            }
            hourMin={SCHEDULE_HOUR_MIN}
            hourMax={SCHEDULE_HOUR_MAX - 1}
            hint={t('timezoneNote', { tz: businessTimezone })}
          />
          {scheduleError && (
            <InfoBox
              variant="warning"
              icon={<WarningIcon className="h-4 w-4" weight="fill" />}
              message={scheduleError}
            />
          )}
        </div>
      )}
    </div>
  );
}

function defaultScheduleDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

/**
 * Returns a timestamp that's stable for the current render but refreshes
 * whenever any of the passed dependencies change. Used to feed a "now" value
 * into useMemo validators without calling Date.now() inside the memo body
 * (which violates react-hooks/purity).
 */
function useRenderTimestamp(deps: readonly unknown[]): number {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => Date.now(), deps);
}

// ─────────────────────────────────────────────────────────────────────
// Step 4 — Review
// ─────────────────────────────────────────────────────────────────────

interface ReviewStepProps {
  state: WizardState;
  businessTimezone: string;
}

function ReviewStep({ state, businessTimezone }: Readonly<ReviewStepProps>) {
  const t = useTranslations('notifications.broadcasts');
  const tWizard = useTranslations('notifications.broadcasts.wizard');
  const tAudience = useTranslations('notifications.broadcasts.wizard.audience');
  const uiLocale = useLocale();

  const chipTranslator = (key: string, values?: Record<string, unknown>) =>
    tWizard(key, values as { n: number });
  const chips = describeFilter(state.targetFilter, chipTranslator);

  const sendTimeLabel = useMemo(() => {
    if (state.sendMode === 'now') return t('wizard.review.sendImmediately');
    if (state.sendMode === 'schedule' && state.scheduledAt) {
      return new Date(state.scheduledAt).toLocaleString(uiLocale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return '—';
  }, [state.sendMode, state.scheduledAt, uiLocale, t]);

  return (
    <div
      className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
      style={{ animationDelay: '60ms' }}
    >
      <div className="text-[16px] font-semibold text-[#1A1A1A] mb-1">
        {tWizard('review.title')}
      </div>
      <div className="text-[12px] text-[#A0A0A0] mb-5">
        {tWizard('review.subtitle')}
      </div>

      <div className="space-y-4">
        <SummaryRow
          icon={<MegaphoneIcon className="h-4 w-4" weight="fill" />}
          label={t('detail.title')}
          value={
            <div>
              <div className="text-[13px] font-semibold text-[#1A1A1A]">
                {state.title || '—'}
              </div>
              <div className="text-[12px] text-[#8A8A8A] mt-0.5 whitespace-pre-wrap">
                {state.body}
              </div>
            </div>
          }
        />

        <SummaryRow
          icon={<UsersIcon className="h-4 w-4" weight="fill" />}
          label={tWizard('review.audienceLabel')}
          value={
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <Badge key={chip.key} variant="outline" className="text-[11px]">
                  {chip.label}
                </Badge>
              ))}
            </div>
          }
        />

        <SummaryRow
          icon={<ClockIcon className="h-4 w-4" weight="fill" />}
          label={tWizard('review.sendTimeLabel')}
          value={
            <div>
              <div className="text-[13px] font-semibold text-[#1A1A1A]">
                {sendTimeLabel}
              </div>
              {state.sendMode === 'schedule' && (
                <div className="text-[11px] text-[#A0A0A0] mt-0.5">
                  {tAudience('estimating')} · {businessTimezone}
                </div>
              )}
            </div>
          }
        />

        {state.translation && (
          <SummaryRow
            icon={<CheckCircleIcon className="h-4 w-4" weight="fill" />}
            label="Translation"
            value={
              <div>
                <div className="text-[13px] font-semibold text-[#1A1A1A]">
                  {state.translation.title}
                </div>
                <div className="text-[12px] text-[#8A8A8A] mt-0.5 whitespace-pre-wrap">
                  {state.translation.body}
                </div>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}

interface SummaryRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function SummaryRow({ icon, label, value }: Readonly<SummaryRowProps>) {
  return (
    <div className="flex items-start gap-3 px-3 py-3 rounded-[10px] bg-[var(--paper)] border border-[var(--border-light)]">
      <div className="w-8 h-8 rounded-lg bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0 text-[var(--accent)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wide mb-1">
          {label}
        </div>
        {value}
      </div>
    </div>
  );
}
