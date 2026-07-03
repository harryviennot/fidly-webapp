'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/contexts/business-context';
import { useDefaultProgram } from '@/hooks/use-programs';
import { isPointsProgram } from '@/types';
import { WizardProgress } from './WizardProgress';
import { WizardFooter } from './WizardFooter';
import { WizardStepProvider } from './wizard-context';
import { useWizardProgress } from './useWizardProgress';
import {
  getStepCtaKey,
  getVisibleChapters,
  nextStepPath,
  pathForStep,
  previousStepPath,
  resolveSlug,
} from './registry';
import { PROFILE_TEAM_SIZE_DRAFT_KEY } from './businessTypeDefaults';
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
  const { markCompleted, markSkipped, completeAndFinalize, finalize } = useWizardProgress();
  const { currentBusiness } = useBusiness();
  // Program type drives the first-stamp breadcrumb: the step body is already
  // type-aware (StampStep's tk()), but the shell title comes from the static
  // registry, so a points business would still read "Stamp your card" here.
  const { data: program } = useDefaultProgram(currentBusiness?.id);
  const isPoints = isPointsProgram(program);

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
  const [nextLabel, setNextLabel] = useState<React.ReactNode>(null);
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

  // Filter the chapter list based on step-2 answers (currently: hide the
  // `team` chapter for solo owners). Read the wizard-draft team_size first —
  // ProfileStep writes the chip synchronously, so the draft is current the
  // moment the user clicks the chip, whereas `settings.team_size` lags by
  // a few hundred ms behind the background save. `slug` is in the deps as a
  // navigation tripwire: the draft itself isn't reactive, but every Continue
  // changes the slug, which forces the memo to re-read the draft on the next
  // step's first render. Without the slug dep the memo would cache the wrong
  // value through the entire stale-cache window.
  //
  // IMPORTANT: dep on `settings?.team_size` (the string), NOT on
  // `settings` (the object). Settings reference churns on every background
  // save (logo upload, design_reviewed flag, accent color, ...). If we
  // depended on the whole object, this memo would return a new array on
  // every save → `resolved` memo would get a new identity → the slug-change
  // effect below would re-fire and CLEAR `submitHandlerRef.current` after
  // child effects re-registered it. Net result: the user clicks Continue,
  // `submitHandlerRef.current` is null, the step's submit handler never
  // runs, the step is still marked completed (`markCompleted` in the
  // `else` branch of handleNext), and the user advances with a half-saved
  // state. That's how Basic Fit ended up with `is_active=false` after a
  // wizard run that supposedly passed BackStep.
  const visibleChapters = useMemo(
    () =>
      getVisibleChapters(
        currentBusiness?.settings,
        getDraft<string>(PROFILE_TEAM_SIZE_DRAFT_KEY)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentBusiness?.settings?.team_size, slug, getDraft]
  );
  const resolved = useMemo(
    () => resolveSlug(slug, visibleChapters),
    [slug, visibleChapters]
  );

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
  //
  // DEPS: keyed on the primitive `slugKey` (and `t`) only — NOT on
  // `resolved`. `resolved` is a memo whose identity can change when
  // `visibleChapters` does, even if the underlying step is unchanged.
  // Depending on it would clear `submitHandlerRef` after children
  // re-register it (parent effects run after child effects), and a
  // subsequent Continue click would silently skip the step's submit
  // handler while still marking the step completed. Use the primitive
  // `slugKey` so this fires only on real navigations.
  useEffect(() => {
    setSecondaryAction(null);
    submitHandlerRef.current = null;
    if (resolved) {
      const key = getStepCtaKey(resolved.chapter.id, resolved.subStep.id);
      try {
        const fullLabel = t(key);
        if (fullLabel === key) {
          setNextLabel(null);
          return;
        }
        // Responsive short-label fallback is design-chapter-only. The
        // long "Concevoir ma carte" / "Enregistrer le contenu de ma
        // carte" labels wrap onto two lines on phones; every other
        // chapter's CTA fits a single line so we leave them untouched.
        // Limiting the lookup to this one chapter also stops the
        // dev-warning every time a non-design step's `_short` sibling
        // turns out not to exist.
        let shortLabel: string | null = null;
        if (resolved.chapter.id === 'design') {
          const shortKey = `${key}_short`;
          try {
            const candidate = t(shortKey);
            shortLabel = candidate === shortKey ? null : candidate;
          } catch {
            shortLabel = null;
          }
        }
        if (shortLabel) {
          setNextLabel(
            <>
              <span className="hidden min-[640px]:inline">{fullLabel}</span>
              <span className="min-[640px]:hidden">{shortLabel}</span>
            </>
          );
        } else {
          setNextLabel(fullLabel);
        }
      } catch {
        setNextLabel(null);
      }
    } else {
      setNextLabel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugKey, t]);

  const handleNext = useCallback(async () => {
    if (!resolved) return;
    setIsBusy(true);
    let backgroundSave: BackgroundSave | undefined;
    let redirectTo: string | undefined;
    try {
      if (submitHandlerRef.current) {
        const result = await submitHandlerRef.current();
        if (!result.ok) return; // validation failed — toast came from the step
        backgroundSave = result.save;
        redirectTo = result.redirectTo;
      }

      const step = { chapter: resolved.chapter.id, step: resolved.subStep.id };
      const stepPath = pathForStep(resolved.chapter, resolved.subStep);
      const nextPath = nextStepPath(resolved, visibleChapters);

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
        // Atomic mark-complete + set completed_at. Sequential
        // `markCompleted` then `finalize` used to race: finalize closed
        // over a stale `progress` snapshot and overwrote the last step
        // out of `completed[]` (silently dropping the plan step from
        // the funnel).
        await completeAndFinalize(step);
        clearDraft();
        // Card-upfront plan step: finalisation is now persisted, so hand off
        // to Stripe Checkout. The hard navigation supersedes the dashboard
        // route; if the user returns without paying, the dashboard's checkout
        // gate (not the wizard) catches them.
        if (redirectTo) {
          window.location.href = redirectTo;
          return;
        }
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
  }, [resolved, markCompleted, completeAndFinalize, router, clearDraft, t, visibleChapters]);

  const handleBack = useCallback(() => {
    if (!resolved) return;
    const prev = previousStepPath(resolved, visibleChapters);
    if (prev) router.push(prev);
  }, [resolved, router, visibleChapters]);

  // Steps that auto-advance through a control still call `ctx.skip()`. With
  // the Skip affordance removed, treat skip as a plain forward navigation so
  // those flows keep working without a footer button.
  const handleSkip = useCallback(async () => {
    if (!resolved) return;
    setIsBusy(true);
    try {
      const step = { chapter: resolved.chapter.id, step: resolved.subStep.id };
      await markSkipped(step);
      const nextPath = nextStepPath(resolved, visibleChapters);
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
  }, [resolved, markSkipped, finalize, router, clearDraft, visibleChapters]);

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
    // The `team` chapter is hidden for solo owners (see getVisibleChapters).
    // If a stale bookmark / cached URL points at `/team`, send them onward to
    // the next visible chapter instead of stranding them on "unknown step".
    // Read both sources (draft + settings) so the redirect fires immediately
    // after the chip is picked, not only once the background save has landed.
    const draftedTeamSize = getDraft<string>(PROFILE_TEAM_SIZE_DRAFT_KEY);
    const effectiveTeamSize =
      draftedTeamSize || currentBusiness?.settings?.team_size;
    if (slug?.[0] === 'team' && effectiveTeamSize === 'solo') {
      const recap = resolveSlug(['recap'], visibleChapters);
      if (recap) {
        router.replace(pathForStep(recap.chapter, recap.subStep));
        return <div className="min-h-[100dvh] bg-[var(--background)]" />;
      }
    }
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="wiz-body text-[#888]">{t('errors.unknownStep')}</p>
      </div>
    );
  }

  const { chapter, subStep, chapterIndex, subStepIndex } = resolved;
  const StepComponent = subStep.Component;
  const chapterTitle = t(`chapters.${chapter.id}.title`);
  const subStepTitleKey =
    isPoints && chapter.id === 'first-stamp' && subStep.id === 'stamp'
      ? `chapters.${chapter.id}.steps.${subStep.id}.points.title`
      : `chapters.${chapter.id}.steps.${subStep.id}.title`;
  const subStepTitle = chapter.subSteps.length > 1 ? t(subStepTitleKey) : undefined;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--background)]">
      <WizardProgress
        chapterIndex={chapterIndex}
        chapterCount={visibleChapters.length}
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
            chapter.id === 'design'
              ? 'max-w-[1140px]'
              : chapter.id === 'plan'
                ? 'max-w-[960px]'
                : 'max-w-[640px]'
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
