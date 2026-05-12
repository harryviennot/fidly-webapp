'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { WizardProgress } from './WizardProgress';
import { WizardFooter } from './WizardFooter';
import { WizardStepProvider } from './wizard-context';
import { useWizardProgress } from './useWizardProgress';
import {
  TOTAL_CHAPTERS,
  WIZARD_CHAPTERS,
  isRequiredFloorMet,
  nextStepPath,
  pathForStep,
  previousStepPath,
  resolveSlug,
} from './registry';
import type { BackgroundSave, SubmitHandler, WizardStepContextValue } from './types';

const DRAFT_STORAGE_KEY = 'stampeo:wizard-draft';

interface WizardShellProps {
  slug: string[] | undefined;
}

/**
 * Wizard orchestrator. Resolves the current chapter + sub-step from the URL,
 * renders the chapter component inside a step context, and handles all
 * navigation (Back / Skip / Save & continue / Skip rest of setup).
 *
 * Each step component is purely UI. It registers a submit handler through
 * `useWizardStep()` if it needs to save before advancing. Steps that don't
 * register a handler simply advance on "continue."
 */
export function WizardShell({ slug }: WizardShellProps) {
  const router = useRouter();
  const t = useTranslations('onboardingBusiness');
  const { progress, markCompleted, markSkipped, finalize } = useWizardProgress();

  const submitHandlerRef = useRef<SubmitHandler | null>(null);
  const handlersRef = useRef<{ next: () => Promise<void>; skip: () => Promise<void> }>({
    next: async () => {},
    skip: async () => {},
  });
  // Wizard-wide draft store, persisted to localStorage so values survive:
  //   - sub-step navigation (Back → Forward)
  //   - page reload (browser refresh, accidental nav-away)
  //   - the React-Query/BusinessProvider race where currentBusiness is
  //     stale right after a mutation
  // Cleared in `handleNext`/`handleSkip` on the final step (finalize).
  const draftRef = useRef<Record<string, unknown> | null>(null);
  if (draftRef.current === null) {
    // Lazy init — runs once on first render. useRef doesn't accept a
    // factory, so we guard with a null sentinel instead.
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
        draftRef.current = stored ? (JSON.parse(stored) as Record<string, unknown>) : {};
      } catch {
        draftRef.current = {};
      }
    } else {
      draftRef.current = {};
    }
  }
  const getDraft = useCallback(<T,>(key: string): T | undefined => {
    return draftRef.current?.[key] as T | undefined;
  }, []);
  const setDraft = useCallback((key: string, value: unknown) => {
    if (!draftRef.current) draftRef.current = {};
    draftRef.current[key] = value;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify(draftRef.current)
        );
      } catch {
        // localStorage can throw in private-mode/quota-exceeded; the in-memory
        // ref still has the value, so navigation within this session works.
      }
    }
  }, []);
  const clearDraft = useCallback(() => {
    draftRef.current = {};
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);
  const [canSkip, setCanSkip] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [nextLabel, setNextLabel] = useState<string | null>(null);
  // canProceed is slug-keyed so the parent's slug-effect reset can't race
  // with the child's mount-time setCanProceed call. Effect order would
  // otherwise be: child sets `false`, then parent's [slug] effect runs and
  // overwrites it with `true`. Deriving the value from the latest write +
  // the current slug sidesteps the race entirely.
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

  const resolved = useMemo(() => resolveSlug(slug), [slug]);

  // Stable context — child steps can hold this reference without re-running effects on every nav.
  const stepContext = useMemo<WizardStepContextValue>(
    () => ({
      setSubmitHandler: (fn) => {
        submitHandlerRef.current = fn;
      },
      setCanSkip,
      setIsBusy,
      setNextLabel,
      setCanProceed,
      getDraft,
      setDraft,
      advance: () => void handlersRef.current.next(),
      skip: () => void handlersRef.current.skip(),
    }),
    [setCanProceed, getDraft, setDraft]
  );

  // Reset per-step overrides when the URL changes — each step starts fresh
  // and re-registers what it needs. canProceed isn't reset here because
  // it's slug-keyed (defaults to `true` for any slug a child hasn't
  // written for yet).
  useEffect(() => {
    setCanSkip(false);
    setNextLabel(null);
    submitHandlerRef.current = null;
  }, [slug]);

  const handleNext = useCallback(async () => {
    if (!resolved) return;
    setIsBusy(true);
    let backgroundSave: BackgroundSave | undefined;
    try {
      if (submitHandlerRef.current) {
        const result = await submitHandlerRef.current();
        if (!result.ok) return; // validation failed — toast came from the step
        backgroundSave = result.save;
      }

      const step = { chapter: resolved.chapter.id, step: resolved.subStep.id };
      const stepPath = pathForStep(resolved.chapter, resolved.subStep);
      const nextPath = nextStepPath(resolved);

      if (!nextPath) {
        // Last step — saves here MUST complete before we release to the
        // dashboard, otherwise post-finalize state could be incomplete.
        if (backgroundSave) {
          const saveResult = await backgroundSave();
          if (!saveResult.ok) {
            toast.error(saveResult.reason || t('errors.saveFailed'));
            return;
          }
        }
        await markCompleted(step);
        await finalize();
        clearDraft();
        router.push('/');
        return;
      }

      // Non-final step: navigate immediately, fire save in the background.
      // Completion is recorded only after save success, so setup_progress
      // never claims a step finished if its data didn't persist.
      router.push(nextPath);

      if (backgroundSave) {
        void backgroundSave().then(async (saveResult) => {
          if (saveResult.ok) {
            await markCompleted(step);
          } else {
            toast.error(saveResult.reason || t('errors.saveFailed'));
            router.push(stepPath);
          }
        });
      } else {
        // Nothing to save — record completion now.
        await markCompleted(step);
      }
    } finally {
      setIsBusy(false);
    }
  }, [resolved, markCompleted, finalize, router, clearDraft, t]);

  const handleSkip = useCallback(async () => {
    if (!resolved) return;
    setIsBusy(true);
    try {
      const step = { chapter: resolved.chapter.id, step: resolved.subStep.id };
      await markSkipped(step);
      const nextPath = nextStepPath(resolved);
      if (nextPath) {
        router.push(nextPath);
      } else {
        await finalize();
        clearDraft();
        router.push('/');
      }
    } finally {
      setIsBusy(false);
    }
  }, [resolved, markSkipped, finalize, router, clearDraft]);

  const handleBack = useCallback(() => {
    if (!resolved) return;
    const prev = previousStepPath(resolved);
    if (prev) router.push(prev);
  }, [resolved, router]);

  const handleSkipAll = useCallback(async () => {
    if (!resolved) return;
    setIsBusy(true);
    try {
      // Walk remaining sub-steps, mark each as skipped so the dashboard
      // checklist surfaces them with deep-link CTAs. Then finalize.
      const startChapterIdx = resolved.chapterIndex;
      const startSubIdx = resolved.subStepIndex;
      for (let ci = startChapterIdx; ci < WIZARD_CHAPTERS.length; ci++) {
        const chapter = WIZARD_CHAPTERS[ci];
        const subStart = ci === startChapterIdx ? startSubIdx : 0;
        for (let si = subStart; si < chapter.subSteps.length; si++) {
          const sub = chapter.subSteps[si];
          await markSkipped({ chapter: chapter.id, step: sub.id });
        }
      }
      await finalize();
      clearDraft();
      router.push('/');
    } finally {
      setIsBusy(false);
    }
  }, [resolved, markSkipped, finalize, router, clearDraft]);

  // Keep the ref pointing at the latest handlers so the stable stepContext
  // can dispatch through `handlersRef.current.next()` without staleness.
  useEffect(() => {
    handlersRef.current.next = handleNext;
    handlersRef.current.skip = handleSkip;
  }, [handleNext, handleSkip]);

  if (!resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="wiz-body text-[#888]">{t('errors.unknownStep')}</p>
      </div>
    );
  }

  const { chapter, subStep, chapterIndex, subStepIndex } = resolved;
  const StepComponent = subStep.Component;
  const chapterTitle = t(`chapters.${chapter.id}.title`);
  const subStepTitle =
    chapter.subSteps.length > 1 ? t(`chapters.${chapter.id}.steps.${subStep.id}.title`) : undefined;

  const requiredFloorMet = isRequiredFloorMet(progress.completed);
  const isCurrentRequired = subStep.required;
  // "Skip rest of setup" is offered once the required floor is met AND the current step is not the very last one.
  const canSkipAll = requiredFloorMet && !resolved.isLast;
  // Per-step skip is allowed only when the step itself is not required, AND the step has explicitly opted in via setCanSkip(true).
  const canSkipThisStep = !isCurrentRequired && canSkip;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--background)]">
      <WizardProgress
        chapterIndex={chapterIndex}
        chapterCount={TOTAL_CHAPTERS}
        chapterTitle={chapterTitle}
        subStepIndex={subStepIndex}
        subStepCount={chapter.subSteps.length}
        subStepTitle={subStepTitle}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[640px] px-4 py-6 min-[768px]:px-6 min-[768px]:py-10">
          <WizardStepProvider value={stepContext}>
            <StepComponent />
          </WizardStepProvider>
        </div>
      </main>

      <WizardFooter
        onBack={handleBack}
        onSkip={handleSkip}
        onNext={handleNext}
        onSkipAll={canSkipAll ? handleSkipAll : undefined}
        canSkip={canSkipThisStep}
        canSkipAll={canSkipAll}
        canProceed={canProceed}
        isBusy={isBusy}
        isFirst={chapterIndex === 0 && subStepIndex === 0}
        isLast={resolved.isLast}
        nextLabel={nextLabel ?? undefined}
      />
    </div>
  );
}
