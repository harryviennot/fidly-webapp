'use client';

import { createContext, useContext } from 'react';
import type { LoyaltyProgram, LoyaltyType } from '@/types';

/**
 * Convert-specific companion to the shared WizardStepContext: the live
 * program being converted and the derived target type. Kept separate so the
 * step internals can keep using onboarding's `useWizardStep`/`useWizardDraft`
 * contract untouched.
 */
export interface ConvertWizardContextValue {
  /** The live (source) program. Non-null by the time steps render. */
  program: LoyaltyProgram;
  /** Always the OPPOSITE of the live program's type — derived, never stored. */
  toType: LoyaltyType;
  /** Wipe the localStorage draft (execute step, after completion). */
  clearDraft: () => void;
  /**
   * The execute step hides the header X while a conversion commits / pushes
   * (leaving mid-flight makes no sense), but a FAILED attempt must never
   * trap the owner — the step flips this to bring the X back.
   */
  setExitAllowed: (allowed: boolean) => void;
}

const ConvertWizardContext = createContext<ConvertWizardContextValue | null>(null);

export function ConvertWizardProvider({
  value,
  children,
}: {
  value: ConvertWizardContextValue;
  children: React.ReactNode;
}) {
  return (
    <ConvertWizardContext.Provider value={value}>{children}</ConvertWizardContext.Provider>
  );
}

export function useConvertWizard(): ConvertWizardContextValue {
  const ctx = useContext(ConvertWizardContext);
  if (!ctx) {
    throw new Error('useConvertWizard must be used inside <ConvertWizardProvider>');
  }
  return ctx;
}
