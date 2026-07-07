'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { XIcon } from '@phosphor-icons/react';
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
import { useDefaultProgram } from '@/hooks/use-programs';
import { WizardFooter } from '@/components/onboarding/WizardFooter';
import { WizardStepProvider } from '@/components/onboarding/wizard-context';
import type {
  SecondaryAction,
  SubmitHandler,
  WizardStepContextValue,
} from '@/components/onboarding/types';
import type { ConversionPreview, LoyaltyType } from '@/types';
import { ConvertWizardProvider } from './convert-context';
import { createConvertDraftStore, type ConvertDraftStore } from './draft';
import {
  getVisibleSteps,
  nextConvertPath,
  pathForConvertStep,
  previousConvertPath,
  resolveConvertSlug,
  type ConvertStepId,
} from './registry';
import { IntroStep } from './steps/IntroStep';
import { ProgramStep } from './steps/ProgramStep';
import { DesignStep } from './steps/DesignStep';
import { CustomersStep } from './steps/CustomersStep';
import { NotificationsStep } from './steps/NotificationsStep';
import { BroadcastsStep } from './steps/BroadcastsStep';
import { ReviewStep } from './steps/ReviewStep';
import { ExecuteStep } from './steps/ExecuteStep';

/** Step id → component. Kept out of registry.ts so the nav functions stay
 * pure and unit-testable without pulling React components into the test. */
const STEP_COMPONENTS: Record<ConvertStepId, React.ComponentType> = {
  intro: IntroStep,
  program: ProgramStep,
  design: DesignStep,
  customers: CustomersStep,
  notifications: NotificationsStep,
  broadcasts: BroadcastsStep,
  review: ReviewStep,
  execute: ExecuteStep,
};

interface ConvertWizardShellProps {
  slug: string[] | undefined;
}

/**
 * Conversion-wizard orchestrator. Same architecture as the onboarding
 * WizardShell (URL-driven steps, step components register submit handlers
 * through the shared WizardStepContext, draft store in localStorage) but
 * flat-stepped, with its own draft key and NO setup_progress writes — the
 * business is already fully set up.
 */
export function ConvertWizardShell({ slug }: ConvertWizardShellProps) {
  const router = useRouter();
  const t = useTranslations('conversion');
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const { data: program } = useDefaultProgram(businessId);

  // The target type is ALWAYS the opposite of the live program type —
  // derived on every render, never stored, so a completed conversion
  // (program.type flipped) can't leave a stale direction behind.
  const toType: LoyaltyType = program?.type === 'points' ? 'stamp' : 'points';

  const submitHandlerRef = useRef<SubmitHandler | null>(null);
  const handlersRef = useRef<{ next: () => Promise<void> }>({ next: async () => {} });

  // Draft store — lazily initialised from localStorage (client only), scoped
  // to the business so drafts never leak across businesses. Steps only render
  // once `currentBusiness` resolved (gate below), so reads never miss it.
  const draftRef = useRef<ConvertDraftStore | null>(null);
  const draftBusinessRef = useRef<string | null>(null);
  if (businessId && draftBusinessRef.current !== businessId) {
    draftRef.current = createConvertDraftStore(businessId);
    draftBusinessRef.current = businessId;
  }
  const getDraft = useCallback(<T,>(key: string): T | undefined => {
    return draftRef.current?.get<T>(key);
  }, []);
  const setDraft = useCallback((key: string, value: unknown) => {
    draftRef.current?.set(key, value);
  }, []);
  const clearDraft = useCallback(() => {
    draftRef.current?.clear();
  }, []);

  const [isBusy, setIsBusy] = useState(false);
  const [nextLabel, setNextLabel] = useState<React.ReactNode>(null);
  const [secondaryAction, setSecondaryAction] = useState<SecondaryAction | null>(null);
  const setCanSkip = useCallback((_value: boolean) => {
    void _value; // convert wizard has no skip affordance
  }, []);

  // canProceed is slug-keyed for the same mount-race reason as onboarding:
  // the parent's slug-reset effect must not clobber a child's mount write.
  const slugKey = useMemo(() => (slug ?? []).join('/'), [slug]);
  const slugKeyRef = useRef(slugKey);
  slugKeyRef.current = slugKey;
  const [canProceedState, setCanProceedState] = useState<{
    slug: string;
    value: boolean;
  } | null>(null);
  const canProceed =
    canProceedState && canProceedState.slug === slugKey ? canProceedState.value : true;
  const setCanProceed = useCallback((value: boolean) => {
    setCanProceedState({ slug: slugKeyRef.current, value });
  }, []);

  // The broadcasts step exists only when the customers-step preview reported
  // affected scheduled broadcasts. The draft isn't reactive; `slugKey` is the
  // navigation tripwire that forces a re-read on each step change (same
  // pattern as onboarding's visibleChapters memo).
  const visibleSteps = useMemo(
    () => {
      const preview = getDraft<ConversionPreview>('customers.preview');
      return getVisibleSteps((preview?.affected_broadcasts?.length ?? 0) > 0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slugKey, getDraft]
  );
  const resolved = useMemo(
    () => resolveConvertSlug(slug, visibleSteps),
    [slug, visibleSteps]
  );

  // Seen-tracking, persisted in the draft (contract required by steps).
  const markStepSeen = useCallback(
    (stepKey: string) => {
      const current = getDraft<Record<string, boolean>>('_seen') ?? {};
      if (current[stepKey]) return;
      setDraft('_seen', { ...current, [stepKey]: true });
    },
    [getDraft, setDraft]
  );
  const hasStepBeenSeen = useCallback(
    (stepKey: string) => !!getDraft<Record<string, boolean>>('_seen')?.[stepKey],
    [getDraft]
  );

  const stepContext = useMemo<WizardStepContextValue>(
    () => ({
      setSubmitHandler: (fn) => {
        submitHandlerRef.current = fn;
      },
      setCanSkip,
      setIsBusy,
      setNextLabel,
      setCanProceed,
      setSecondaryAction,
      getDraft,
      setDraft,
      markStepSeen,
      hasStepBeenSeen,
      currentChapterId: resolved?.id ?? null,
      advance: () => void handlersRef.current.next(),
      skip: () => void handlersRef.current.next(),
    }),
    [setCanProceed, setCanSkip, getDraft, setDraft, markStepSeen, hasStepBeenSeen, resolved]
  );

  // Reset per-step overrides on navigation and install the step's default CTA
  // label from conversion.json. Keyed on the primitive slugKey only (see the
  // onboarding shell for the submit-handler-clearing race this avoids).
  useEffect(() => {
    setSecondaryAction(null);
    submitHandlerRef.current = null;
    // t.has, not a speculative t(): next-intl reports a missing key as an
    // error (the execute step deliberately has no CTA key).
    const key = resolved ? `steps.${resolved.id}.cta` : null;
    setNextLabel(key && t.has(key) ? t(key) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugKey, t]);

  const handleNext = useCallback(async () => {
    if (!resolved) return;
    setIsBusy(true);
    try {
      if (submitHandlerRef.current) {
        const result = await submitHandlerRef.current();
        if (!result.ok) return; // validation failed — toast came from the step
      }
      const nextPath = nextConvertPath(resolved, visibleSteps);
      if (nextPath) router.push(nextPath);
    } finally {
      setIsBusy(false);
    }
  }, [resolved, visibleSteps, router]);

  const handleBack = useCallback(() => {
    if (!resolved) return;
    const prev = previousConvertPath(resolved, visibleSteps);
    if (prev) router.push(prev);
  }, [resolved, visibleSteps, router]);

  // Abandon path — X in the header, confirm dialog, draft dropped so the
  // next visit starts clean. Unavailable on the execute step: once the owner
  // validated the switch, the conversion is committed server-side and the
  // only way out is the success screen's own CTA.
  const [exitOpen, setExitOpen] = useState(false);
  const handleExit = useCallback(() => {
    clearDraft();
    router.push('/program/settings');
  }, [clearDraft, router]);

  useEffect(() => {
    handlersRef.current.next = handleNext;
  }, [handleNext]);

  // Hydration gate — the draft store reads localStorage, which only exists
  // client-side; rendering before mount would mismatch the SSR tree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect unknown/hidden slugs to the intro instead of stranding the user.
  useEffect(() => {
    if (!mounted) return;
    if (!resolved) router.replace(pathForConvertStep('intro'));
  }, [mounted, resolved, router]);

  if (!mounted || !resolved || !program || !currentBusiness) {
    return <div className="min-h-[100dvh] bg-[var(--background)]" />;
  }

  const StepComponent = STEP_COMPONENTS[resolved.id];
  const isExecute = resolved.id === 'execute';
  const percent = ((resolved.index + 1) / resolved.count) * 100;

  return (
    // Hard-locked to the viewport: the ONLY scroll surface is <main>, so the
    // footer is a plain flex child docked at the bottom — document scroll and
    // overscroll rubber-banding can never nudge it.
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--background)]">
      <header className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--background)]">
        <div
          className="h-[3px] bg-[var(--accent)] transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
        <div className="flex items-center gap-3 px-4 py-3 min-[768px]:px-6 min-[768px]:py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#999]">
              {t('header.step', { current: resolved.index + 1, total: resolved.count })}
            </p>
            <h1 className="mt-1 text-[17px] font-semibold leading-snug text-[var(--foreground)]">
              {t('header.title')}
            </h1>
          </div>
          {!isExecute && (
            <button
              type="button"
              onClick={() => setExitOpen(true)}
              aria-label={t('exit.label')}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[#7A7A7A] transition-colors hover:bg-[var(--paper-hover)] hover:text-[var(--foreground)]"
            >
              <XIcon className="h-5 w-5" weight="bold" />
            </button>
          )}
        </div>
      </header>

      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exit.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('exit.body')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('exit.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleExit}>{t('exit.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div
          className={
            // Design (form + side preview) and review (card + facts) are
            // two-column on desktop; the rest stay a comfortable single column.
            resolved.id === 'design' || resolved.id === 'review'
              ? 'mx-auto w-full max-w-[1140px] px-4 py-6 min-[768px]:px-6 min-[768px]:py-10'
              : 'mx-auto w-full max-w-[640px] px-4 py-6 min-[768px]:px-6 min-[768px]:py-10'
          }
        >
          <WizardStepProvider value={stepContext}>
            <ConvertWizardProvider value={{ program, toType, clearDraft }}>
              <StepComponent />
            </ConvertWizardProvider>
          </WizardStepProvider>
        </div>
      </main>

      {/* The execute step is terminal: no back, no continue — it owns its own
          exit CTA once the conversion completes. */}
      {!isExecute && (
        <WizardFooter
          onBack={handleBack}
          onNext={handleNext}
          secondaryAction={secondaryAction}
          canProceed={canProceed}
          isBusy={isBusy}
          isFirst={resolved.index === 0}
          isLast={resolved.isLast}
          nextLabel={nextLabel ?? undefined}
        />
      )}
    </div>
  );
}
