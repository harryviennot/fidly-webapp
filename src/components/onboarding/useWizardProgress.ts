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
      await updateBusiness({
        settings: {
          ...(currentBusiness.settings ?? {}),
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
    isStepCompleted,
  };
}
