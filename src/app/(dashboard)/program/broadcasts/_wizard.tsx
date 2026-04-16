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
  MegaphoneIcon,
  PaperPlaneRightIcon,
  UsersIcon,
  ClockIcon,
  FunnelIcon,
  WarningIcon,
  InfoIcon,
  TrashIcon,
  XCircleIcon,
  FloppyDiskIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useProgram } from '../layout';
import { useEntitlements } from '@/hooks/useEntitlements';
import {
  useBroadcast,
  useCreateBroadcast,
  useUpdateBroadcast,
  useRecipientEstimate,
  useSendBroadcast,
  useCancelBroadcast,
} from '@/hooks/use-notifications';
import { ApiError } from '@/api/client';
import { cn } from '@/lib/utils';
import { describeFilter } from '@/lib/broadcast-filters';
import { MessagePreview, PlanGatedField } from '@/components/notifications';
import { AnimatedNumber } from '@/components/redesign/animated-number';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

/** Common IANA timezone choices — covers Western/Central Europe + UTC. */
const TIMEZONE_OPTIONS = [
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Brussels',
  'Europe/Amsterdam',
  'Europe/Zurich',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Montreal',
  'UTC',
] as const;

interface WizardState {
  title: string;
  body: string;
  /** Optional secondary-locale translation (nullable when not added yet). */
  translation: { title: string; body: string } | null;
  targetFilter: BroadcastTargetFilter;
  sendMode: SendMode | null;
  scheduledAt: Date | null;
  /** IANA timezone for the scheduled time. Defaults to browser timezone. */
  timezone: string;
}

const BROWSER_TIMEZONE =
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';

const EMPTY_STATE: WizardState = {
  title: '',
  body: '',
  translation: null,
  targetFilter: { all: true },
  sendMode: 'now',
  scheduledAt: null,
  timezone: BROWSER_TIMEZONE,
};

/** Default "name this broadcast" value for new broadcasts. Internal-only. */
function buildDefaultBroadcastName(locale: Locale): string {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
  return `Broadcast — ${formatted}`;
}

// ─────────────────────────────────────────────────────────────────────
// Shared entry — handles loading + routing guards.
// Both /program/broadcasts/new and /program/broadcasts/[id]/edit render
// this component, passing `forcedEditId` accordingly. `/new` also honors
// the legacy `?edit=<id>` URL for existing bookmarks.
// ─────────────────────────────────────────────────────────────────────

interface BroadcastWizardEntryProps {
  forcedEditId?: string | null;
}

export function BroadcastWizardEntry({
  forcedEditId,
}: Readonly<BroadcastWizardEntryProps>) {
  const searchParams = useSearchParams();
  const editId = forcedEditId ?? searchParams.get('edit');
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
  const { program } = useProgram();
  const programName = program?.name ?? null;
  const { hasFeature } = useEntitlements();

  const canSchedule = hasFeature('notifications.scheduled');
  const canSegment = hasFeature('notifications.segmentation');
  const primaryLocale: Locale = currentBusiness?.primary_locale ?? 'fr';
  const secondaryLocale: Locale = primaryLocale === 'fr' ? 'en' : 'fr';

  // ─── Initial state ───
  // `title` is an internal-only label the business uses to find broadcasts
  // in their history — it is NOT sent to customers. For new broadcasts we
  // seed a locale-formatted default like "Broadcast — Mar 15, 14:30" so the
  // row in the list is always identifiable; for edits we keep the saved
  // value as-is.
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
        timezone: existing.timezone ?? BROWSER_TIMEZONE,
      };
    }
    return {
      ...EMPTY_STATE,
      title: buildDefaultBroadcastName(primaryLocale),
    };
  }, [existing, primaryLocale, secondaryLocale]);

  const [state, setState] = useState<WizardState>(initialState);
  const [currentStep, setCurrentStep] = useState<StepKey>('compose');
  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmDestructive, setConfirmDestructive] = useState<
    null | 'delete-draft' | 'cancel-scheduled'
  >(null);

  const { data: estimate, isFetching: estimating } = useRecipientEstimate(
    currentBusiness?.id,
    state.targetFilter,
    true
  );
  const estimatedCount = estimate?.total ?? null;

  const createMutation = useCreateBroadcast(currentBusiness?.id);
  const updateMutation = useUpdateBroadcast(currentBusiness?.id);
  const sendMutation = useSendBroadcast(currentBusiness?.id);
  const cancelMutation = useCancelBroadcast(currentBusiness?.id);
  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    sendMutation.isPending ||
    cancelMutation.isPending;

  const isEditing = !!editId && !!existing;
  const isEditingDraft = isEditing && existing?.status === 'draft';
  const isEditingScheduled = isEditing && existing?.status === 'scheduled';

  const currentIndex = STEPS.indexOf(currentStep);
  const isLastStep = currentIndex === STEPS.length - 1;

  // ─── Step validation ───
  // `nowRef` freezes the "is this in the future" reference at every user
  // interaction. Re-computed at render time keeps the impurity rule happy
  // (the value is stable within a render pass).
  const renderTs = useRenderTimestamp([currentStep, state]);
  const canAdvance = useMemo(() => {
    if (currentStep === 'compose') {
      // Title is optional — when empty, the worker falls back to the
      // program name on the customer's wallet banner. Body is still
      // required.
      return state.body.trim().length > 0;
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
      timezone?: string;
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
        payload.timezone = state.timezone;
      } else if (state.sendMode === 'now') {
        payload.immediate = true;
      }
    }

    return payload;
  };

  // ─── Actions ───

  /**
   * New-mode header button: saves the current form state as a draft. Never
   * triggers a send. Edit mode uses `handleSave` instead — that path keeps
   * the broadcast's current status (scheduled/draft) intact.
   */
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

  /**
   * Edit-mode "Save" — persists the current form state as-is, respecting
   * the broadcast's existing status. Draft stays draft; scheduled stays
   * scheduled (with the possibly-updated scheduledAt). No send, no step
   * advancement — returns to the list immediately.
   */
  const handleSave = async () => {
    if (!editId) return;
    try {
      const basePayload = buildPayload(false);
      const scheduledAt =
        isEditingScheduled && state.sendMode === 'schedule' && state.scheduledAt
          ? state.scheduledAt.toISOString()
          : null;
      await updateMutation.mutateAsync({
        id: editId,
        payload: {
          ...basePayload,
          scheduled_at: scheduledAt,
        },
      });
      toast.success(
        isEditingScheduled ? tToast('scheduled') : tToast('draftSaved')
      );
      router.push('/program/broadcasts');
    } catch (err) {
      handleMutationError(err);
    }
  };

  /**
   * Edit-mode destructive: cancel a scheduled broadcast. Moves it back to
   * draft (PATCH scheduled_at=null) rather than flipping it to 'cancelled'
   * — matches the user mental model of "undo the schedule, keep the work".
   */
  const handleCancelScheduled = async () => {
    if (!editId) return;
    setConfirmDestructive(null);
    try {
      await updateMutation.mutateAsync({
        id: editId,
        payload: { scheduled_at: null },
      });
      toast.success(tToast('scheduledCancelled'));
      router.push('/program/broadcasts');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : tToast('cancelFailed')
      );
    }
  };

  /** Edit-mode destructive: delete a draft entirely. */
  const handleDeleteDraft = async () => {
    if (!editId) return;
    setConfirmDestructive(null);
    try {
      await cancelMutation.mutateAsync(editId);
      toast.success(tToast('deleted'));
      router.push('/program/broadcasts');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : tToast('deleteFailed')
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
      {/* Header with back + step indicator + header actions */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push('/program/broadcasts')}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors"
        >
          <CaretLeftIcon className="h-3.5 w-3.5" />
          {t('page.title')}
        </button>
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-[#A0A0A0] font-medium mr-1">
            {tWizard('stepIndicator', {
              current: currentIndex + 1,
              total: STEPS.length,
            })}
          </div>
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setConfirmDestructive(
                    isEditingScheduled ? 'cancel-scheduled' : 'delete-draft'
                  )
                }
                disabled={isBusy}
                className="h-8 rounded-full px-3 text-[var(--error)] border-[var(--error)]/40 bg-transparent hover:!bg-[var(--error)]/10 hover:!text-[var(--error)] hover:!border-[var(--error)]/60"
              >
                {isEditingScheduled ? (
                  <>
                    <XCircleIcon className="h-3.5 w-3.5" />
                    {tWizard('cancelBroadcast')}
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-3.5 w-3.5" />
                    {tWizard('deleteDraft')}
                  </>
                )}
              </Button>
              <Button
                variant="gradient"
                size="sm"
                onClick={handleSave}
                disabled={isBusy || !state.body.trim()}
                className="h-8 rounded-full px-3"
              >
                {tWizard('save')}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isBusy || !state.body.trim()}
              className="h-8 rounded-full px-3"
            >
              <FloppyDiskIcon className="h-3.5 w-3.5" weight="fill" />
              {tWizard('saveDraft')}
            </Button>
          )}
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
      <div className="flex gap-[14px] flex-col min-[1080px]:flex-row min-[1080px]:items-start min-h-[440px]">
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
            />
          )}
          {currentStep === 'review' && (
            <ReviewStep
              state={state}
              setState={setState}
              estimatedCount={estimatedCount}
              estimating={estimating}
            />
          )}
        </div>

        {/* Right sidebar — progressive summary. Hidden on review step
            (review shows its own inline summary and takes full width). */}
        {currentStep !== 'review' && (
          <WizardSummarySidebar
            currentIndex={currentIndex}
            state={state}
            estimatedCount={estimatedCount}
            estimating={estimating}
            iconUrl={currentBusiness?.icon_url ?? null}
            iconOriginalUrl={currentBusiness?.icon_original_url ?? null}
            programName={programName}
            businessName={currentBusiness?.name ?? ''}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={isBusy}
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          {currentIndex === 0 ? tWizard('cancel') : tWizard('back')}
        </Button>

        <div className="flex items-center justify-end min-w-[200px] gap-2">
          {isLastStep ? (
            <>
              {/* Edit scheduled → only Save (no send). Edit draft → Save +
                  Send now. New mode → Send/Schedule based on sendMode. */}
              {isEditingScheduled ? (
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={handleSave}
                  disabled={!canAdvance || isBusy}
                >
                  {tWizard('save')}
                </Button>
              ) : isEditingDraft ? (
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={handleNext}
                  disabled={!canAdvance || isBusy || !state.sendMode}
                >
                  <PaperPlaneRightIcon className="h-3.5 w-3.5" />
                  {t('wizard.review.sendButton')}
                </Button>
              ) : (
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
              )}
            </>
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

      <AlertDialog
        open={confirmDestructive !== null}
        onOpenChange={(open) => !open && setConfirmDestructive(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDestructive === 'delete-draft'
                ? t('detail.confirmDelete')
                : t('detail.confirmCancel')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDestructive === 'delete-draft'
                ? t('detail.confirmDeleteBody')
                : t('detail.confirmCancelBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>
              {tWizard('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={
                confirmDestructive === 'delete-draft'
                  ? handleDeleteDraft
                  : handleCancelScheduled
              }
              disabled={isBusy}
            >
              {confirmDestructive === 'delete-draft'
                ? tWizard('deleteDraft')
                : tWizard('cancelBroadcast')}
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
  const body = isPrimary ? state.body : state.translation?.body ?? '';

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

      <BroadcastLocalePills
        primaryLocale={primaryLocale}
        secondaryLocale={secondaryLocale}
        editingLocale={editingLocale}
        hasTranslation={!!state.translation}
        onSwitch={handleLocaleChange}
        onRemoveTranslation={() =>
          setState((s) => ({ ...s, translation: null }))
        }
      />

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
  );
}

// ─── Language pills for the compose step ───────────────────────────
// Shows one pill per "added" language (primary is always present; secondary
// appears once the user clicks the dropdown to add it). Click a pill to
// switch the fields; click the × on the secondary pill to remove the
// translation entirely. The "Translations" dropdown on the far right lists
// languages the user hasn't added yet — empty = dropdown hidden.
const LOCALE_FLAGS: Record<Locale, string> = { fr: '🇫🇷', en: '🇬🇧' };
const LOCALE_NATIVE: Record<Locale, string> = { fr: 'Français', en: 'English' };

interface BroadcastLocalePillsProps {
  primaryLocale: Locale;
  secondaryLocale: Locale;
  editingLocale: Locale;
  hasTranslation: boolean;
  onSwitch: (loc: Locale) => void;
  onRemoveTranslation: () => void;
}

function BroadcastLocalePills({
  primaryLocale,
  secondaryLocale,
  editingLocale,
  hasTranslation,
  onSwitch,
  onRemoveTranslation,
}: Readonly<BroadcastLocalePillsProps>) {
  const t = useTranslations('notifications.editor');
  const availableToAdd: Locale[] = hasTranslation ? [] : [secondaryLocale];

  return (
    <div className="flex items-center justify-between gap-2 mt-4 mb-4 min-h-[32px]">
      <div className="flex items-center gap-1.5 flex-wrap">
        <LocalePill
          locale={primaryLocale}
          active={editingLocale === primaryLocale}
          onClick={() => onSwitch(primaryLocale)}
        />
        {hasTranslation && (
          <LocalePill
            locale={secondaryLocale}
            active={editingLocale === secondaryLocale}
            onClick={() => onSwitch(secondaryLocale)}
            onRemove={() => {
              onRemoveTranslation();
              if (editingLocale === secondaryLocale) onSwitch(primaryLocale);
            }}
          />
        )}
      </div>
      {availableToAdd.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-black/85 transition-colors"
            >
              + {t('translations')}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            {availableToAdd.map((loc) => (
              <DropdownMenuItem
                key={loc}
                onSelect={() => onSwitch(loc)}
                className="flex items-center gap-2"
              >
                <span className="text-[14px] leading-none">
                  {LOCALE_FLAGS[loc]}
                </span>
                {LOCALE_NATIVE[loc]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface LocalePillProps {
  locale: Locale;
  active: boolean;
  onClick: () => void;
  onRemove?: () => void;
}

function LocalePill({
  locale,
  active,
  onClick,
  onRemove,
}: Readonly<LocalePillProps>) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border transition-colors text-[11.5px] font-semibold',
        active
          ? 'bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)]'
          : 'bg-[var(--paper)] border-[var(--border-light)] text-[#555] hover:border-[var(--border)]'
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1"
      >
        <span className="text-[13px] leading-none">{LOCALE_FLAGS[locale]}</span>
        {LOCALE_NATIVE[locale]}
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label="remove translation"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="pr-2 pl-0.5 text-current opacity-60 hover:opacity-100"
        >
          <XCircleIcon className="h-3.5 w-3.5" weight="fill" />
        </button>
      )}
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

      {/* Filter groups */}
      {!isAll && (
        <div className="space-y-4">
          <EnrollmentAgeGroup
            targetFilter={state.targetFilter}
            updateFilter={updateFilter}
          />

          <PlanGatedField
            requiredTier="pro"
            upgradeFrom="broadcasts.segmentation"
            gatedTitle={t('group.stamps') + ' & ' + t('group.activity')}
            gatedDescription={t('filteredDescription')}
          >
            <div className="space-y-4">
              <StampsGroup
                targetFilter={state.targetFilter}
                updateFilter={updateFilter}
                disabled={!canSegment}
              />
              <ActivityGroup
                targetFilter={state.targetFilter}
                updateFilter={updateFilter}
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

// ─── Segmentation groups ────────────────────────────────────────────
// Each group bundles related filters under a single labelled section with
// an info tooltip. The "Enrollment age" group enforces mutual exclusivity
// between `enrolled_after_days` (recent) and `enrolled_before_days` (old)
// because the two together would mean "joined within N days AND more than
// M days ago" — almost always unintended.

type UpdateFilterFn = <K extends keyof BroadcastTargetFilter>(
  key: K,
  value: BroadcastTargetFilter[K]
) => void;

interface FilterGroupProps {
  targetFilter: BroadcastTargetFilter;
  updateFilter: UpdateFilterFn;
  disabled?: boolean;
}

function GroupHeader({
  label,
  help,
}: Readonly<{ label: string; help: string }>) {
  return (
    <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-[#555] uppercase tracking-wide">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[#A0A0A0] hover:text-[#555]"
          >
            <InfoIcon className="h-3.5 w-3.5" weight="regular" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[260px] text-[11px] leading-[1.45]"
        >
          {help}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

type EnrollmentMode = 'any' | 'recent' | 'old';

function EnrollmentAgeGroup({
  targetFilter,
  updateFilter,
}: Readonly<FilterGroupProps>) {
  const t = useTranslations('notifications.broadcasts.wizard.audience');

  const getMode = (): EnrollmentMode => {
    if (typeof targetFilter.enrolled_after_days === 'number') return 'recent';
    if (typeof targetFilter.enrolled_before_days === 'number') return 'old';
    return 'any';
  };
  const mode = getMode();
  const currentValue =
    mode === 'recent'
      ? targetFilter.enrolled_after_days
      : mode === 'old'
      ? targetFilter.enrolled_before_days
      : undefined;

  const setMode = (next: EnrollmentMode) => {
    // Mutual exclusivity: clear the unused key before writing the new one.
    updateFilter('enrolled_after_days', undefined);
    updateFilter('enrolled_before_days', undefined);
    if (next === 'recent') {
      updateFilter('enrolled_after_days', currentValue ?? 30);
    } else if (next === 'old') {
      updateFilter('enrolled_before_days', currentValue ?? 30);
    }
  };

  const setDays = (v: number | undefined) => {
    if (mode === 'recent') updateFilter('enrolled_after_days', v);
    else if (mode === 'old') updateFilter('enrolled_before_days', v);
  };

  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--paper)] p-3">
      <GroupHeader
        label={t('group.enrollment')}
        help={t('group.enrollmentHelp')}
      />
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {(['any', 'recent', 'old'] as EnrollmentMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'rounded-md border text-[11.5px] font-semibold py-1.5 transition-colors',
              mode === m
                ? 'bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)]'
                : 'bg-white border-[var(--border-light)] text-[#555] hover:border-[var(--border)]'
            )}
          >
            {t(`enrollment.${m}`)}
          </button>
        ))}
      </div>
      {mode !== 'any' && (
        <>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={currentValue ?? ''}
              placeholder={t('enrollment.daysPlaceholder')}
              onChange={(e) => {
                const raw = e.target.value;
                setDays(raw === '' ? undefined : parseInt(raw, 10));
              }}
              className="w-[120px] h-8 text-sm"
            />
            <span className="text-[11.5px] text-[#8A8A8A]">
              {t('enrollment.daysSuffix')}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-[#8A8A8A] leading-[1.45]">
            {t(`enrollment.${mode}Desc`)}
          </p>
        </>
      )}
    </div>
  );
}

function StampsGroup({
  targetFilter,
  updateFilter,
  disabled,
}: Readonly<FilterGroupProps>) {
  const t = useTranslations('notifications.broadcasts.wizard.audience');

  const onChange = (
    key: 'stamp_count_min' | 'stamp_count_max',
    raw: string
  ) => {
    updateFilter(key, raw === '' ? undefined : parseInt(raw, 10));
  };

  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--paper)] p-3">
      <GroupHeader label={t('group.stamps')} help={t('group.stampsHelp')} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-[#555] mb-1 block">
            {t('stamps.minLabel')}
          </Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              disabled={disabled}
              value={targetFilter.stamp_count_min ?? ''}
              placeholder={t('stamps.placeholder')}
              onChange={(e) => onChange('stamp_count_min', e.target.value)}
              className="h-8 text-sm"
            />
            <span className="text-[11px] text-[#8A8A8A] shrink-0">
              {t('stamps.suffix')}
            </span>
          </div>
        </div>
        <div>
          <Label className="text-[11px] text-[#555] mb-1 block">
            {t('stamps.maxLabel')}
          </Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              disabled={disabled}
              value={targetFilter.stamp_count_max ?? ''}
              placeholder={t('stamps.placeholder')}
              onChange={(e) => onChange('stamp_count_max', e.target.value)}
              className="h-8 text-sm"
            />
            <span className="text-[11px] text-[#8A8A8A] shrink-0">
              {t('stamps.suffix')}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[#8A8A8A] leading-[1.45]">
        {t('stamps.help')}
      </p>
    </div>
  );
}

function ActivityGroup({
  targetFilter,
  updateFilter,
  disabled,
}: Readonly<FilterGroupProps>) {
  const t = useTranslations('notifications.broadcasts.wizard.audience');

  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--paper)] p-3">
      <GroupHeader label={t('group.activity')} help={t('group.activityHelp')} />

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <Label className="text-[12px] text-[#1A1A1A] font-medium">
            {t('activity.hasRedeemedLabel')}
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="help"
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[#A0A0A0] hover:text-[#555]"
              >
                <InfoIcon className="h-3.5 w-3.5" weight="regular" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-[11px] leading-[1.45]">
              {t('activity.hasRedeemedHelp')}
            </TooltipContent>
          </Tooltip>
        </div>
        <Switch
          checked={!!targetFilter.has_redeemed}
          onCheckedChange={(v) =>
            updateFilter('has_redeemed', v ? true : undefined)
          }
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <Label className="text-[12px] text-[#1A1A1A] font-medium">
            {t('activity.inactiveLabel')}
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="help"
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[#A0A0A0] hover:text-[#555]"
              >
                <InfoIcon className="h-3.5 w-3.5" weight="regular" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-[11px] leading-[1.45]">
              {t('activity.inactiveHelp')}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            disabled={disabled}
            value={targetFilter.inactive_days ?? ''}
            placeholder={t('activity.inactivePlaceholder')}
            onChange={(e) => {
              const raw = e.target.value;
              updateFilter(
                'inactive_days',
                raw === '' ? undefined : parseInt(raw, 10)
              );
            }}
            className="w-[120px] h-8 text-sm"
          />
          <span className="text-[11px] text-[#8A8A8A] shrink-0">
            {t('enrollment.daysSuffix')}
          </span>
        </div>
      </div>
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
}

/**
 * Pure scheduling check — only validates that the date is in the future.
 * No hour restriction: businesses manage their own send timing.
 */
function isScheduleValid(date: Date | null, now: number): boolean {
  if (!date) return false;
  return date.getTime() > now;
}

function ScheduleStep({
  state,
  setState,
  canSchedule,
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
    return null;
  }, [state.sendMode, state.scheduledAt, t, renderTs]);

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
          gatedTitle={t('scheduleLater')}
          gatedDescription={t('scheduleLaterDescription')}
        >
          <button
            type="button"
            onClick={() => setMode('schedule')}
            disabled={!canSchedule}
            className={cn(
              'w-full p-4 rounded-[10px] text-left border-[1.5px] transition-all',
              state.sendMode === 'schedule'
                ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                : 'border-[var(--border-light)] bg-[var(--paper)] hover:border-[var(--border)]'
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
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">
              {t('timezoneLabel')}
            </span>
            <Select
              value={state.timezone}
              onValueChange={(tz) =>
                setState((s) => ({ ...s, timezone: tz }))
              }
            >
              <SelectTrigger className="w-[220px] !py-2 !rounded-md text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz} value={tz} className="text-xs">
                    {tz.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
                {/* Include browser timezone if not in the preset list */}
                {!TIMEZONE_OPTIONS.includes(
                  state.timezone as (typeof TIMEZONE_OPTIONS)[number]
                ) && (
                  <SelectItem
                    value={state.timezone}
                    className="text-xs"
                  >
                    {state.timezone.replace(/_/g, ' ')}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
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
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  estimatedCount: number | null;
  estimating: boolean;
}

function ReviewStep({
  state,
  setState,
  estimatedCount,
  estimating,
}: Readonly<ReviewStepProps>) {
  const t = useTranslations('notifications.broadcasts');
  const tWizard = useTranslations('notifications.broadcasts.wizard');
  const uiLocale = useLocale();
  const { currentBusiness } = useBusiness();
  const { program } = useProgram();
  const programName = program?.name ?? null;

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
      });
    }
    return null;
  }, [state.sendMode, state.scheduledAt, uiLocale]);

  const hasTranslation =
    !!state.translation && state.translation.body.trim().length > 0;

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

      {/* Internal-only broadcast name — business-facing label for the
          history list. Never sent to customers. */}
      <div className="mb-4">
        <Label className="text-[12px] font-semibold text-[#555] mb-1.5">
          {tWizard('review.nameLabel')}
        </Label>
        <Input
          value={state.title}
          onChange={(e) =>
            setState((s) => ({ ...s, title: e.target.value }))
          }
          placeholder={tWizard('review.namePlaceholder')}
        />
        <p className="text-[11px] text-[#8A8A8A] mt-1.5">
          {tWizard('review.nameHelp')}
        </p>
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
            </div>
          </div>
        </div>
      </div>

      {/* Message preview */}
      <div className="mb-4">
        <MessagePreview
          iconUrl={currentBusiness?.icon_url ?? null}
          iconOriginalUrl={currentBusiness?.icon_original_url ?? null}
          programName={programName}
          businessName={currentBusiness?.name ?? ''}
          body={state.body}
        />
      </div>

      {/* Summary rows */}
      <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--paper)] divide-y divide-[var(--border-light)]">
        <SummaryCompactRow
          icon={<MegaphoneIcon className="h-3.5 w-3.5" weight="fill" />}
          label={tWizard('review.contentLabel')}
          value={
            <div className="text-[12.5px] text-[#1A1A1A] text-right line-clamp-3 whitespace-pre-wrap">
              {state.body || '—'}
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
              <div className="text-[12.5px] text-[#1A1A1A] text-right line-clamp-3 whitespace-pre-wrap">
                {state.translation.body || '—'}
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Progressive summary sidebar — visible alongside compose/audience/schedule
// steps. Each sub-card appears once the user has confirmed the matching
// step by pressing Next. Hidden entirely on the review step (review shows
// its own inline summary and takes full width).
// ─────────────────────────────────────────────────────────────────────

interface WizardSummarySidebarProps {
  currentIndex: number;
  state: WizardState;
  estimatedCount: number | null;
  estimating: boolean;
  iconUrl: string | null;
  iconOriginalUrl: string | null;
  programName: string | null;
  businessName: string;
}

function WizardSummarySidebar({
  currentIndex,
  state,
  estimatedCount,
  estimating,
  iconUrl,
  iconOriginalUrl,
  programName,
  businessName,
}: Readonly<WizardSummarySidebarProps>) {
  const tWizard = useTranslations('notifications.broadcasts.wizard');
  const uiLocale = useLocale();
  const chipTranslator = (key: string, values?: Record<string, unknown>) =>
    tWizard(key, values as { n: number });
  const chips = describeFilter(state.targetFilter, chipTranslator);
  const isEveryone = !!state.targetFilter.all;

  // Audience card becomes visible once the user leaves the audience step.
  const showAudience = currentIndex >= 2;
  // Schedule card becomes visible once the user leaves the schedule step.
  // In practice this only fires on the review step, where the whole sidebar
  // is hidden — kept for symmetry in case the flow is extended later.
  const showSchedule = currentIndex >= 3;

  const scheduledLabel =
    state.sendMode === 'schedule' && state.scheduledAt
      ? new Date(state.scheduledAt).toLocaleString(uiLocale, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  return (
    <div className="hidden min-[1080px]:flex w-[290px] min-w-[290px] flex-shrink-0 flex-col">
      <div className="min-[1080px]:sticky min-[1080px]:top-5 flex flex-col gap-[14px]">
        {/* Message preview — always visible */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px] animate-slide-up">
          <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-3">
            {tWizard('summary.messageLabel')}
          </div>
          <MessagePreview
            iconUrl={iconUrl}
            iconOriginalUrl={iconOriginalUrl}
            programName={programName}
            businessName={businessName}
            body={state.body}
          />
        </div>

        {/* Audience summary — shows after leaving the audience step */}
        {showAudience && (
          <div
            className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px] animate-slide-up"
            style={{ animationDelay: '60ms' }}
          >
            <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-3">
              {tWizard('review.audienceLabel')}
            </div>

            {isEveryone ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center shrink-0">
                  <UsersIcon
                    className="h-5 w-5 text-[var(--accent)]"
                    weight="fill"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-[#1A1A1A] leading-tight">
                    {tWizard('audience.chip.all')}
                  </div>
                  <div className="text-[11.5px] text-[#8A8A8A] mt-0.5">
                    {estimating && estimatedCount === null ? (
                      '…'
                    ) : (
                      <>
                        <AnimatedNumber
                          value={estimatedCount ?? 0}
                          className="font-semibold text-[#1A1A1A] tabular-nums"
                        />{' '}
                        {tWizard(
                          (estimatedCount ?? 0) === 1
                            ? 'summary.customerOne'
                            : 'summary.customerOther'
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {chips.map((chip) => (
                    <Badge
                      key={chip.key}
                      variant="outline"
                      className="rounded-full bg-[var(--paper)] border border-[var(--border-light)] px-2.5 py-1 text-[11px] font-medium text-[#555]"
                    >
                      {chip.label}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-light)]">
                  <UsersIcon
                    className="h-3.5 w-3.5 text-[var(--accent)]"
                    weight="fill"
                  />
                  <div className="text-[11.5px] text-[#8A8A8A]">
                    {estimating && estimatedCount === null ? (
                      '…'
                    ) : (
                      <>
                        <AnimatedNumber
                          value={estimatedCount ?? 0}
                          className="font-semibold text-[#1A1A1A] tabular-nums"
                        />{' '}
                        {tWizard(
                          (estimatedCount ?? 0) === 1
                            ? 'summary.customerOne'
                            : 'summary.customerOther'
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Schedule summary — shows after leaving the schedule step */}
        {showSchedule && (
          <div
            className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px] animate-slide-up"
            style={{ animationDelay: '120ms' }}
          >
            <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-3">
              {tWizard('review.sendTimeLabel')}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center shrink-0">
                {state.sendMode === 'schedule' ? (
                  <ClockIcon
                    className="h-5 w-5 text-[var(--accent)]"
                    weight="fill"
                  />
                ) : (
                  <PaperPlaneRightIcon
                    className="h-5 w-5 text-[var(--accent)]"
                    weight="fill"
                  />
                )}
              </div>
              <div className="min-w-0 text-[13px] font-semibold text-[#1A1A1A] leading-tight">
                {state.sendMode === 'schedule' && scheduledLabel
                  ? scheduledLabel
                  : tWizard('schedule.sendNow')}
              </div>
            </div>
          </div>
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

