'use client';

import { useCallback } from 'react';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import type { SetupProgress, SetupStepRef } from '@/types/business';

function defaultProgress(): SetupProgress {
  return {
    started_at: new Date().toISOString(),
    completed_at: null,
    last_step: { chapter: 'welcome' },
    completed: [],
    skipped: [],
    payload: {},
  };
}

function stepKey(s: SetupStepRef): string {
  return `${s.chapter}:${s.step ?? ''}`;
}

/**
 * Read/write helpers for `businesses.settings.setup_progress`. The single source of
 * truth for where a business is in the launch wizard.
 *
 * Each mutation patches the JSONB blob via `useUpdateBusiness`. The hook does not
 * own local state — callers should rely on `currentBusiness` (the business
 * context) re-rendering after the mutation invalidates the cache.
 */
export function useWizardProgress() {
  const { currentBusiness } = useBusiness();
  const { mutateAsync: updateBusiness } = useUpdateBusiness(currentBusiness?.id);

  const progress: SetupProgress = currentBusiness?.settings?.setup_progress ?? defaultProgress();

  const writeProgress = useCallback(
    async (next: SetupProgress) => {
      if (!currentBusiness) return;
      // Send ONLY setup_progress. The backend shallow-merges into the
      // stored settings, so other keys stay intact. Spreading
      // `currentBusiness.settings` here used to race other in-flight
      // saves (DataCollectionStep especially) — our stale spread would
      // resurrect old values the other save had just overwritten.
      await updateBusiness({
        settings: {
          setup_progress: next,
        },
      });
    },
    [currentBusiness, updateBusiness]
  );

  const markCompleted = useCallback(
    async (step: SetupStepRef) => {
      const key = stepKey(step);
      const completed = progress.completed.some((s) => stepKey(s) === key)
        ? progress.completed
        : [...progress.completed, step];
      const skipped = progress.skipped.filter((s) => stepKey(s) !== key);
      await writeProgress({ ...progress, completed, skipped, last_step: step });
    },
    [progress, writeProgress]
  );

  const markSkipped = useCallback(
    async (step: SetupStepRef) => {
      const key = stepKey(step);
      const skipped = progress.skipped.some((s) => stepKey(s) === key)
        ? progress.skipped
        : [...progress.skipped, step];
      await writeProgress({ ...progress, skipped, last_step: step });
    },
    [progress, writeProgress]
  );

  const finalize = useCallback(async () => {
    if (progress.completed_at) return;
    await writeProgress({ ...progress, completed_at: new Date().toISOString() });
  }, [progress, writeProgress]);

  const updatePayload = useCallback(
    async (patch: Partial<SetupProgress['payload']>) => {
      await writeProgress({
        ...progress,
        payload: { ...progress.payload, ...patch },
      });
    },
    [progress, writeProgress]
  );

  /**
   * Atomic "mark step completed AND patch payload" — used by detection-driven
   * advancement (e.g. FirstCustomerStep auto-advance) where the wizard shell's
   * regular submit → markCompleted flow would race with a freshly-written
   * payload and overwrite it. Reads `currentBusiness.settings.setup_progress`
   * directly to avoid the stale-closure problem with `progress`.
   */
  const completeWithPayload = useCallback(
    async (step: SetupStepRef, patch: Partial<SetupProgress['payload']>) => {
      if (!currentBusiness) return;
      const current: SetupProgress = currentBusiness.settings?.setup_progress ?? defaultProgress();
      const key = stepKey(step);
      const completed = current.completed.some((s) => stepKey(s) === key)
        ? current.completed
        : [...current.completed, step];
      const skipped = current.skipped.filter((s) => stepKey(s) !== key);
      const next: SetupProgress = {
        ...current,
        completed,
        skipped,
        last_step: step,
        payload: { ...current.payload, ...patch },
      };
      // Diff-only update — see writeProgress above for the rationale.
      await updateBusiness({
        settings: { setup_progress: next },
      });
    },
    [currentBusiness, updateBusiness]
  );

  const isStepCompleted = useCallback(
    (step: SetupStepRef): boolean => {
      return progress.completed.some((s) => stepKey(s) === stepKey(step));
    },
    [progress]
  );

  return {
    progress,
    markCompleted,
    markSkipped,
    finalize,
    updatePayload,
    completeWithPayload,
    isStepCompleted,
  };
}
