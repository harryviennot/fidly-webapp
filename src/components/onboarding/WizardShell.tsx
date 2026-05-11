'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { WizardProgress } from './WizardProgress';
import { WizardFooter } from './WizardFooter';
import { WizardStepProvider } from './wizard-context';
import { useWizardProgress } from './useWizardProgress';
import {
  TOTAL_CHAPTERS,
  WIZARD_CHAPTERS,
  isRequiredFloorMet,
  nextStepPath,
  previousStepPath,
  resolveSlug,
} from './registry';
import type { SubmitHandler, WizardStepContextValue } from './types';

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
  const [canSkip, setCanSkip] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [nextLabel, setNextLabel] = useState<string | null>(null);

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
      advance: () => void handlersRef.current.next(),
      skip: () => void handlersRef.current.skip(),
    }),
    []
  );

  // Reset per-step overrides when the URL changes — each step starts fresh
  // and re-registers what it needs.
  useEffect(() => {
    setCanSkip(false);
    setNextLabel(null);
    submitHandlerRef.current = null;
  }, [slug]);

  const handleNext = useCallback(async () => {
    if (!resolved) return;
    setIsBusy(true);
    try {
      if (submitHandlerRef.current) {
        const result = await submitHandlerRef.current();
        if (!result.ok) return;
      }
      const step = { chapter: resolved.chapter.id, step: resolved.subStep.id };
      await markCompleted(step);
      const nextPath = nextStepPath(resolved);
      if (nextPath) {
        router.push(nextPath);
      } else {
        // Last step — finalize and release to dashboard.
        await finalize();
        router.push('/');
      }
    } finally {
      setIsBusy(false);
    }
  }, [resolved, markCompleted, finalize, router]);

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
        router.push('/');
      }
    } finally {
      setIsBusy(false);
    }
  }, [resolved, markSkipped, finalize, router]);

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
      router.push('/');
    } finally {
      setIsBusy(false);
    }
  }, [resolved, markSkipped, finalize, router]);

  // Keep the ref pointing at the latest handlers so the stable stepContext
  // can dispatch through `handlersRef.current.next()` without staleness.
  useEffect(() => {
    handlersRef.current.next = handleNext;
    handlersRef.current.skip = handleSkip;
  }, [handleNext, handleSkip]);

  if (!resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-[14px] text-[#888]">{t('errors.unknownStep')}</p>
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
        isBusy={isBusy}
        isFirst={chapterIndex === 0 && subStepIndex === 0}
        isLast={resolved.isLast}
        nextLabel={nextLabel ?? undefined}
      />
    </div>
  );
}
