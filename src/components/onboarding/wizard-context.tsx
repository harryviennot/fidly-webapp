'use client';

import { createContext, useCallback, useContext, useState } from 'react';
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
