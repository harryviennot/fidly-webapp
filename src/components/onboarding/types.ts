import type { ComponentType } from 'react';

export type SubmitResult = { ok: true } | { ok: false; reason?: string };

export type SubmitHandler = () => Promise<SubmitResult>;

export interface WizardStepContextValue {
  /** Step registers a save handler; shell invokes it on "Save & continue". Pass null to clear. */
  setSubmitHandler: (fn: SubmitHandler | null) => void;
  /** Step declares whether the footer "Skip" affordance should be available. */
  setCanSkip: (canSkip: boolean) => void;
  /** Step declares it's mid-async-work; shell disables the footer accordingly. */
  setIsBusy: (busy: boolean) => void;
  /** Step-initiated forward navigation (used when a UI control auto-advances). */
  advance: () => void;
  /** Step-initiated skip (same as footer skip; rarely needed from inside a step). */
  skip: () => void;
}

export interface SubStepDef {
  id: string;
  required: boolean;
  Component: ComponentType;
}

export interface ChapterDef {
  id: string;
  subSteps: SubStepDef[];
}

export interface ResolvedStep {
  chapter: ChapterDef;
  subStep: SubStepDef;
  chapterIndex: number;
  subStepIndex: number;
  isLast: boolean;
}
