import type { ComponentType } from 'react';

/**
 * Optional background-save function returned alongside `{ ok: true }` from a
 * step's submit handler. The shell fires it AFTER navigating forward, so the
 * user doesn't wait on the API. If it returns `{ ok: false }`, the shell
 * redirects the user back to the originating step with a toast.
 *
 * Reserve background save for OPTIONAL info that's safe to retry after the
 * fact (settings tweaks, profile chips, etc). Steps that create critical
 * resources (e.g. the business row, a Stripe session) should NOT use this —
 * they must complete before the user moves on, otherwise downstream steps
 * have nothing to operate on.
 */
export type BackgroundSave = () => Promise<
  { ok: true } | { ok: false; reason?: string }
>;

export type SubmitResult =
  | { ok: true; save?: BackgroundSave }
  | { ok: false; reason?: string };

export type SubmitHandler = () => Promise<SubmitResult>;

/**
 * Optional secondary CTA a step can pin into the wizard footer next to
 * Continue. Styled by the footer (black bg, white text) so all steps stay
 * visually consistent — the step only owns the content and the handler.
 */
export interface SecondaryAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

export interface WizardStepContextValue {
  /** Step registers a save handler; shell invokes it on "Save & continue". Pass null to clear. */
  setSubmitHandler: (fn: SubmitHandler | null) => void;
  /** Step declares whether the footer "Skip" affordance should be available. */
  setCanSkip: (canSkip: boolean) => void;
  /** Step declares it's mid-async-work; shell disables the footer accordingly. */
  setIsBusy: (busy: boolean) => void;
  /** Override the primary CTA label on the footer for this step (e.g. "Let's go" on Welcome). Pass null to reset. */
  setNextLabel: (label: string | null) => void;
  /**
   * Step declares whether the primary CTA should be enabled. Default `true`.
   * Use to mute the Continue button until required fields validate.
   */
  setCanProceed: (canProceed: boolean) => void;
  /**
   * Register a secondary action button rendered next to Continue in the
   * footer — same shape as Continue but black/white. Used by the design
   * chapter's mobile preview trigger. Pass `null` to clear. Resets on
   * step navigation so each step starts blank.
   */
  setSecondaryAction: (action: SecondaryAction | null) => void;
  /**
   * Read a previously-stashed value from the wizard-wide draft store. Returns
   * `undefined` when nothing has been written for `key` yet. Use a namespaced
   * key like `"identity.website"` to avoid collisions across steps.
   */
  getDraft: <T = unknown>(key: string) => T | undefined;
  /**
   * Write a value into the wizard-wide draft store. The draft survives
   * sub-step navigation but lives in memory only — it clears when the wizard
   * completes or the page reloads.
   */
  setDraft: (key: string, value: unknown) => void;
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
