'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/contexts/business-context';
import { regenerateStripsForDesign } from '@/api/designs';
import { WizardProgress } from './WizardProgress';
import { WizardFooter } from './WizardFooter';
import { WizardStepProvider } from './wizard-context';
import { useWizardProgress } from './useWizardProgress';
import {
  TOTAL_CHAPTERS,
  getStepCtaKey,
  nextStepPath,
  pathForStep,
  previousStepPath,
  resolveSlug,
} from './registry';
import type { BackgroundSave, SecondaryAction, SubmitHandler, WizardStepContextValue } from './types';

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
  const { currentBusiness } = useBusiness();

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
  const [isBusy, setIsBusy] = useState(false);
  const [nextLabel, setNextLabel] = useState<string | null>(null);
  const [secondaryAction, setSecondaryAction] = useState<SecondaryAction | null>(null);
  // Skip + Skip-all are no longer rendered. Existing step components still
  // call `setCanSkip(true)` on mount — accept the calls and discard so we
  // don't have to rip every call site out. The footer no longer reads any
  // skip-related state.
  const setCanSkip = useCallback((_value: boolean) => {
    void _value;
  }, []);
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

  // Step-seen tracking. Persisted via the draft store under `_seen` so it
  // survives sub-step navigation, reload, and the React tree being torn down
  // and rebuilt. Cleared on `finalize()` along with the rest of the draft.
  const markStepSeen = useCallback(
    (stepKey: string) => {
      const current = (getDraft<Record<string, boolean>>('_seen') ?? {}) as Record<string, boolean>;
      if (current[stepKey]) return;
      setDraft('_seen', { ...current, [stepKey]: true });
    },
    [getDraft, setDraft]
  );
  const hasStepBeenSeen = useCallback(
    (stepKey: string) => {
      const current = getDraft<Record<string, boolean>>('_seen');
      return !!current?.[stepKey];
    },
    [getDraft]
  );

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
      setSecondaryAction,
      getDraft,
      setDraft,
      markStepSeen,
      hasStepBeenSeen,
      currentChapterId: resolved?.chapter.id ?? null,
      advance: () => void handlersRef.current.next(),
      skip: () => void handlersRef.current.skip(),
    }),
    [setCanProceed, setCanSkip, getDraft, setDraft, markStepSeen, hasStepBeenSeen, resolved]
  );

  // Reset per-step overrides when the URL changes — each step starts fresh
  // and re-registers what it needs. canProceed isn't reset here because
  // it's slug-keyed (defaults to `true` for any slug a child hasn't
  // written for yet). The default Continue label comes from
  // `getStepCtaKey` — steps that need a different label can still call
  // `ctx.setNextLabel` to override.
  useEffect(() => {
    setSecondaryAction(null);
    submitHandlerRef.current = null;
    if (resolved) {
      const key = getStepCtaKey(resolved.chapter.id, resolved.subStep.id);
      try {
        // Some chapters use a nested object (e.g. first-broadcast.compose
        // has pre/post variants). For those, callers override via
        // setNextLabel after mount; here we attempt the simple-string form
        // and fall back to null (footer's i18n default kicks in).
        const label = t(key);
        setNextLabel(label === key ? null : label);
      } catch {
        setNextLabel(null);
      }
    } else {
      setNextLabel(null);
    }
  }, [slug, resolved, t]);

  // Design-chapter exit: fire one explicit regenerate-strips call when the
  // user leaves the chapter, so all the per-step saves (which passed
  // `regenerate_strips=false`) coalesce into a single render. `design.stripDirty`
  // is set by each design sub-step on a successful save; we clear it after
  // a successful trigger and best-effort log failures (the next save would
  // re-trigger anyway).
  const prevChapterIdRef = useRef<string | null>(resolved?.chapter.id ?? null);
  useEffect(() => {
    const prev = prevChapterIdRef.current;
    const next = resolved?.chapter.id ?? null;
    if (prev === 'design' && next !== null && next !== 'design') {
      const stripDirty = !!getDraft<boolean>('design.stripDirty');
      const designId = (progress?.payload as { design_id?: string } | undefined)?.design_id;
      const businessId = currentBusiness?.id;
      if (stripDirty && designId && businessId) {
        setDraft('design.stripDirty', false);
        void regenerateStripsForDesign(businessId, designId).catch((err) => {
          console.error('Strip regeneration on design-chapter exit failed', err);
        });
      }
    }
    prevChapterIdRef.current = next;
  }, [resolved?.chapter.id, getDraft, setDraft, progress, currentBusiness?.id]);

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

  const handleBack = useCallback(() => {
    if (!resolved) return;
    const prev = previousStepPath(resolved);
    if (prev) router.push(prev);
  }, [resolved, router]);

  // Steps that auto-advance through a control still call `ctx.skip()`. With
  // the Skip affordance removed, treat skip as a plain forward navigation so
  // those flows keep working without a footer button.
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

  // Keep the ref pointing at the latest handlers so the stable stepContext
  // can dispatch through `handlersRef.current.next()` without staleness.
  useEffect(() => {
    handlersRef.current.next = handleNext;
    handlersRef.current.skip = handleSkip;
  }, [handleNext, handleSkip]);

  // Hydration gate. The draft store reads from localStorage, which exists
  // only on the client — calling `getDraft` during SSR returns different
  // values than during the first client render and React throws a
  // hydration mismatch. Render an empty shell until after mount, then the
  // real tree comes up with consistent client-side state.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return <div className="min-h-[100dvh] bg-[var(--background)]" />;
  }

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
        {/*
          The design chapter renders a sticky preview alongside the form, so
          it needs more horizontal room. Other chapters keep the comfortable
          single-column max-width so reading isn't wide-screen overwhelm.
        */}
        <div
          className={cn(
            'mx-auto w-full px-4 py-6 min-[768px]:px-6 min-[768px]:py-10',
            chapter.id === 'design' ? 'max-w-[1140px]' : 'max-w-[640px]'
          )}
        >
          <WizardStepProvider value={stepContext}>
            <StepComponent />
          </WizardStepProvider>
        </div>
      </main>

      <WizardFooter
        onBack={handleBack}
        onNext={handleNext}
        secondaryAction={secondaryAction}
        canProceed={canProceed}
        isBusy={isBusy}
        isFirst={chapterIndex === 0 && subStepIndex === 0}
        isLast={resolved.isLast}
        nextLabel={nextLabel ?? undefined}
      />
    </div>
  );
}
