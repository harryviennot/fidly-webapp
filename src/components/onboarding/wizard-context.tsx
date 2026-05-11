'use client';

import { createContext, useContext } from 'react';
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
