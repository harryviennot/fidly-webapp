'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { WizardStepContextValue } from './types';

const WizardStepContext = createContext<WizardStepContextValue | null>(null);

export function WizardStepProvider({
  value,
  children,
}: {
  value: WizardStepContextValue;
  children: React.ReactNode;
}) {
  return <WizardStepContext.Provider value={value}>{children}</WizardStepContext.Provider>;
}

export function useWizardStep(): WizardStepContextValue {
  const ctx = useContext(WizardStepContext);
  if (!ctx) {
    throw new Error('useWizardStep must be used inside <WizardStepProvider> (a wizard sub-step)');
  }
  return ctx;
}

/**
 * Stateful slice of the wizard's in-memory draft store. Acts like `useState`
 * but reads the initial value from the draft store first, then falls back to
 * `initial()` (typically reading from the API-backed `currentBusiness`).
 *
 * Every setter call mirrors the new value into the draft so navigation away
 * and back rehydrates the field. Use a namespaced key like
 * `"identity.website"` so different steps don't collide.
 *
 *     const [website, setWebsite] = useWizardDraft(
 *       'identity.website',
 *       () => currentBusiness?.website ?? ''
 *     );
 */
export function useWizardDraft<T>(
  key: string,
  initial: () => T
): [T, (next: T) => void] {
  const ctx = useWizardStep();
  const [value, setValueState] = useState<T>(() => {
    const stashed = ctx.getDraft<T>(key);
    if (stashed !== undefined) return stashed;
    return initial();
  });
  const setValue = useCallback(
    (next: T) => {
      setValueState(next);
      ctx.setDraft(key, next);
    },
    [ctx, key]
  );
  return [value, setValue];
}

/**
 * Returns a stable `isDirty` flag and a `markSaved` helper for a snapshot of
 * the step's current form state, keyed against the wizard draft store.
 *
 *  - `isDirty` is `true` when the JSON of `current` differs from the value
 *    last passed to `markSaved`.
 *  - `markSaved()` records the current snapshot. Call it from the step's
 *    `save` callback after the API write succeeds.
 *
 * Use this to skip the background save when the user navigates Back→Forward
 * without editing anything. The saved snapshot persists in the draft store
 * (localStorage), so it survives reload too.
 */
export function useDirtySnapshot<T>(
  key: string,
  current: T
): { isDirty: boolean; markSaved: () => void } {
  const ctx = useWizardStep();
  const draftKey = `_saved.${key}`;
  const currentJson = JSON.stringify(current);
  const savedJson = ctx.getDraft<string>(draftKey);
  const isDirty = savedJson !== currentJson;
  const markSaved = useCallback(() => {
    ctx.setDraft(draftKey, currentJson);
  }, [ctx, draftKey, currentJson]);
  return { isDirty, markSaved };
}

/**
 * Marks a sub-step key as seen on first mount, and reports whether it was
 * seen on a previous visit. Used by the design editor to decide whether
 * defaults should apply — defaults only run the first time the user sees a
 * sub-step, otherwise they would clobber whatever the user already saved.
 *
 *     const { seen, markSeen } = useStepSeen('design.branding');
 *     // `seen` reflects the value BEFORE this mount marked it.
 */
export function useStepSeen(stepKey: string): { seen: boolean; markSeen: () => void } {
  const ctx = useWizardStep();
  // Snapshot the seen flag at first render via lazy-init useState. Reading
  // the value through useState instead of a ref keeps the linter happy and
  // ensures the value is frozen for the life of this mount even after the
  // post-render effect flips the underlying draft entry to true.
  const [seen] = useState<boolean>(() => ctx.hasStepBeenSeen(stepKey));
  useEffect(() => {
    ctx.markStepSeen(stepKey);
    // Mark-once-on-mount semantics; depending on ctx is fine because the
    // shell context is stable across navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);
  return {
    seen,
    markSeen: () => ctx.markStepSeen(stepKey),
  };
}

