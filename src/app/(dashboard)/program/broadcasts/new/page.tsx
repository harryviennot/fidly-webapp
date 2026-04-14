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
  InfoIcon,
  TranslateIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import {
  LocaleTabs,
  MessagePreview,
  PlanGatedField,
} from '@/components/notifications';
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
const BODY_CHAR_LIMIT = 100;

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

  const { data: estimate, isFetching: estimating } = useRecipientEstimate(
    currentBusiness?.id,
    state.targetFilter,
    true
  );
  const estimatedCount = estimate?.total ?? null;

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
        return isScheduleValid(state.scheduledAt, renderTs, businessTimezone);
      }
      return false;
    }
    return true;
  }, [currentStep, state, renderTs, businessTimezone]);

  // ─── Build payload for save ───
  const hasFilledTranslation =
    !!state.translation &&
    (state.translation.title.trim().length > 0 ||
      state.translation.body.trim().length > 0);

  const buildPayload = (includeSendMode: boolean) => {
    const translations: BroadcastTranslations = {};
    if (hasFilledTranslation && state.translation) {
      translations[secondaryLocale] = {
        title: state.translation.title.trim(),
        body: state.translation.body.trim(),
      };
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

    if (hasFilledTranslation) {
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
        const translationsPayload: BroadcastTranslations =
          hasFilledTranslation && state.translation
            ? {
                [secondaryLocale]: {
                  title: state.translation.title.trim(),
                  body: state.translation.body.trim(),
                },
              }
            : {};
        // Edit mode: PATCH with schedule or send via /send
        if (state.sendMode === 'schedule') {
          await updateMutation.mutateAsync({
            id: editId,
            payload: {
              title: state.title.trim(),
              body: state.body.trim(),
              translations: translationsPayload,
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
              translations: translationsPayload,
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
      {/* Header with back + step indicator + save draft */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push('/program/broadcasts')}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors"
        >
          <CaretLeftIcon className="h-3.5 w-3.5" />
          {t('page.title')}
        </button>
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-[#A0A0A0] font-medium">
            {tWizard('stepIndicator', {
              current: currentIndex + 1,
              total: STEPS.length,
            })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveDraft}
            disabled={
              isBusy || !state.title.trim() || !state.body.trim()
            }
            className="h-8"
          >
            <FloppyDiskIcon className="h-3.5 w-3.5" />
            {tWizard('saveDraft')}
          </Button>
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
              estimatedCount={estimatedCount}
              estimating={estimating}
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
              estimatedCount={estimatedCount}
              estimating={estimating}
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

        <div className="flex items-center justify-end min-w-[200px]">
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
              {t('wizard.review.confirmSend', {
                count: estimatedCount ?? '…',
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {state.sendMode === 'now'
                ? t('wizard.review.confirmSendNowBody')
                : t('wizard.review.confirmSendScheduleBody')}
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
  const [editingLocale, setEditingLocale] = useState<Locale>(primaryLocale);

  const isPrimary = editingLocale === primaryLocale;
  const title = isPrimary ? state.title : state.translation?.title ?? '';
  const body = isPrimary ? state.body : state.translation?.body ?? '';

  const hasTranslation =
    !!state.translation &&
    (state.translation.title.trim().length > 0 ||
      state.translation.body.trim().length > 0);

  const setTitle = (value: string) => {
    setState((s) => {
      if (editingLocale === primaryLocale) return { ...s, title: value };
      const existing = s.translation ?? { title: '', body: '' };
      return { ...s, translation: { ...existing, title: value } };
    });
  };
  const setBody = (value: string) => {
    setState((s) => {
      if (editingLocale === primaryLocale) return { ...s, body: value };
      const existing = s.translation ?? { title: '', body: '' };
      return { ...s, translation: { ...existing, body: value } };
    });
  };

  const handleLocaleChange = (loc: Locale) => {
    if (loc !== primaryLocale) {
      setState((s) =>
        s.translation
          ? s
          : { ...s, translation: { title: '', body: '' } }
      );
    }
    setEditingLocale(loc);
  };

  return (
    <div
      className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
      style={{ animationDelay: '60ms' }}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <div className="text-[16px] font-semibold text-[#1A1A1A]">
            {t('title')}
          </div>
          <div className="text-[12px] text-[#A0A0A0]">{t('subtitle')}</div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="translation hint"
              className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-[#A0A0A0] hover:text-[#555] hover:bg-[var(--paper-hover)] transition-colors"
            >
              <InfoIcon className="h-4 w-4" weight="regular" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[260px] text-[11px] leading-[1.45]">
            {t('translationHint')}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center justify-between gap-2 mt-4 mb-4">
        <LocaleTabs
          value={editingLocale}
          onValueChange={handleLocaleChange}
          primaryLocale={primaryLocale}
        />
        {hasTranslation && editingLocale === primaryLocale && (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[var(--accent-light)] text-[var(--accent)] text-[10px] font-semibold px-2 py-0.5">
            <TranslateIcon className="h-3 w-3" weight="bold" />
            {secondaryLocale.toUpperCase()}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-[12px] font-semibold text-[#555] mb-1.5">
            {t('titleLabel')}
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
          />
        </div>
        <div>
          <Label className="text-[12px] font-semibold text-[#555] mb-1.5 flex items-center justify-between">
            <span>{t('bodyLabel')}</span>
            <span
              className={cn(
                'text-[11px] font-normal tabular-nums',
                body.length > BODY_CHAR_LIMIT
                  ? 'text-[var(--warning)]'
                  : 'text-[#A0A0A0]'
              )}
            >
              {t('charCount', { count: body.length, max: BODY_CHAR_LIMIT })}
            </span>
          </Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('bodyPlaceholder')}
            className="min-h-[100px] resize-none"
          />
        </div>
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
  estimatedCount: number | null;
  estimating: boolean;
}

function AudienceStep({
  state,
  setState,
  canSegment,
  estimatedCount,
  estimating,
}: Readonly<AudienceStepProps>) {
  const t = useTranslations('notifications.broadcasts.wizard.audience');

  const isAll = !!state.targetFilter.all;

  const setAll = (on: boolean) => {
    setState((s) => ({
      ...s,
      targetFilter: on ? { all: true } : {},
    }));
  };

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
          {estimating && estimatedCount === null ? (
            <span className="text-[#A0A0A0]">{t('estimating')}</span>
          ) : (
            <span>{t('estimate', { count: estimatedCount ?? 0 })}</span>
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
 * Hour at the given instant, interpreted in the given IANA time zone.
 * Using Intl keeps the comparison correct when the business TZ differs
 * from the viewer's browser TZ (the common case for roaming owners).
 */
function hourInTimeZone(date: Date, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone,
    }).format(date)
  );
}

/**
 * Pure scheduling check. `now` must be passed in explicitly so callers
 * (e.g. useMemo) remain idempotent — we never call `Date.now()` inside
 * the function itself.
 */
function isScheduleValid(
  date: Date | null,
  now: number,
  timeZone: string
): boolean {
  if (!date) return false;
  if (date.getTime() < now) return false;
  const hour = hourInTimeZone(date, timeZone);
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
    const hour = hourInTimeZone(state.scheduledAt, businessTimezone);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
        <button
          type="button"
          onClick={() => setMode('now')}
          className={cn(
            'w-full p-4 rounded-[10px] text-left border-[1.5px] transition-all',
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
  estimatedCount: number | null;
  estimating: boolean;
}

function ReviewStep({
  state,
  businessTimezone,
  estimatedCount,
  estimating,
}: Readonly<ReviewStepProps>) {
  const t = useTranslations('notifications.broadcasts');
  const tWizard = useTranslations('notifications.broadcasts.wizard');
  const uiLocale = useLocale();
  const { currentBusiness } = useBusiness();

  const chipTranslator = (key: string, values?: Record<string, unknown>) =>
    tWizard(key, values as { n: number });
  const chips = describeFilter(state.targetFilter, chipTranslator);

  const scheduledLabel = useMemo(() => {
    if (state.sendMode === 'schedule' && state.scheduledAt) {
      return new Date(state.scheduledAt).toLocaleString(uiLocale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: businessTimezone,
      });
    }
    return null;
  }, [state.sendMode, state.scheduledAt, uiLocale, businessTimezone]);

  const hasTranslation =
    !!state.translation &&
    (state.translation.title.trim().length > 0 ||
      state.translation.body.trim().length > 0);

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

      {/* Hero: recipient count + send time */}
      <div className="rounded-[12px] border border-[var(--accent)]/30 bg-[var(--accent-light)] p-4 min-[1080px]:p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
            <PaperPlaneRightIcon
              className="h-5 w-5 text-[var(--accent)]"
              weight="fill"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider mb-0.5">
              {tWizard('review.recipientsLabel')}
            </div>
            <div className="text-[22px] font-bold text-[#1A1A1A] tabular-nums leading-none">
              {estimating && estimatedCount === null ? (
                <span className="text-[#A0A0A0]">…</span>
              ) : (
                tWizard('review.heroRecipients', {
                  count: estimatedCount ?? 0,
                })
              )}
            </div>
            <div className="text-[11px] text-[#555] mt-1">
              {state.sendMode === 'schedule' && scheduledLabel
                ? tWizard('review.heroScheduledFor', { date: scheduledLabel })
                : tWizard('review.heroImmediate')}
              {' · '}
              {businessTimezone}
            </div>
          </div>
        </div>
      </div>

      {/* Message preview */}
      <div className="mb-4">
        <MessagePreview
          iconUrl={currentBusiness?.icon_url ?? null}
          businessName={currentBusiness?.name ?? ''}
          body={state.body || state.title}
        />
      </div>

      {/* Summary rows */}
      <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--paper)] divide-y divide-[var(--border-light)]">
        <SummaryCompactRow
          icon={<MegaphoneIcon className="h-3.5 w-3.5" weight="fill" />}
          label={t('detail.title')}
          value={
            <div className="text-right">
              <div className="text-[12.5px] font-semibold text-[#1A1A1A] truncate">
                {state.title || '—'}
              </div>
              <div className="text-[11px] text-[#8A8A8A] line-clamp-2 whitespace-pre-wrap">
                {state.body}
              </div>
            </div>
          }
        />

        <SummaryCompactRow
          icon={<UsersIcon className="h-3.5 w-3.5" weight="fill" />}
          label={tWizard('review.audienceLabel')}
          value={
            <div className="flex flex-wrap gap-1 justify-end">
              {chips.map((chip) => (
                <Badge key={chip.key} variant="outline" className="text-[10px]">
                  {chip.label}
                </Badge>
              ))}
            </div>
          }
        />

        <SummaryCompactRow
          icon={<ClockIcon className="h-3.5 w-3.5" weight="fill" />}
          label={tWizard('review.sendTimeLabel')}
          value={
            <div className="text-[12.5px] font-semibold text-[#1A1A1A] text-right">
              {state.sendMode === 'schedule' && scheduledLabel
                ? scheduledLabel
                : t('wizard.review.sendImmediately')}
            </div>
          }
        />

        {hasTranslation && state.translation && (
          <SummaryCompactRow
            icon={<CheckCircleIcon className="h-3.5 w-3.5" weight="fill" />}
            label={tWizard('review.translationLabel')}
            value={
              <div className="text-right">
                <div className="text-[12.5px] font-semibold text-[#1A1A1A] truncate">
                  {state.translation.title || '—'}
                </div>
                <div className="text-[11px] text-[#8A8A8A] line-clamp-2 whitespace-pre-wrap">
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

interface SummaryCompactRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function SummaryCompactRow({
  icon,
  label,
  value,
}: Readonly<SummaryCompactRowProps>) {
  return (
    <div className="flex items-start justify-between gap-4 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wide shrink-0">
        <span className="text-[var(--accent)]">{icon}</span>
        {label}
      </div>
      <div className="flex-1 min-w-0">{value}</div>
    </div>
  );
}

