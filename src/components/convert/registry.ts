/**
 * Pure navigation registry for the conversion wizard (`/convert/*`).
 *
 * Mirrors the onboarding registry's nav-function style but stays flat (no
 * chapters) and free of React imports so it is unit-testable. The step id →
 * component map lives in `ConvertWizardShell.tsx`.
 *
 * The `broadcasts` step is conditional: it only exists when the customers-step
 * preview reported scheduled broadcasts whose targeting refers to the old
 * program type. All nav functions therefore take the caller's *visible* step
 * list, exactly like onboarding's `getVisibleChapters` contract.
 */

export const CONVERT_BASE_PATH = '/convert';

export type ConvertStepId =
  | 'intro'
  | 'program'
  | 'design'
  | 'customers'
  | 'notifications'
  | 'broadcasts'
  | 'review'
  | 'execute';

export const CONVERT_STEP_ORDER: readonly ConvertStepId[] = [
  'intro',
  'program',
  'design',
  'customers',
  'notifications',
  'broadcasts',
  'review',
  'execute',
];

export interface ResolvedConvertStep {
  id: ConvertStepId;
  /** Index within the visible list it was resolved against. */
  index: number;
  /** Length of the visible list (for the progress header). */
  count: number;
  isLast: boolean;
}

/** The step list for this wizard run. `includeBroadcasts` comes from the
 * drafted preview (`affected_broadcasts.length > 0`). */
export function getVisibleSteps(includeBroadcasts: boolean): ConvertStepId[] {
  return CONVERT_STEP_ORDER.filter(
    (id) => includeBroadcasts || id !== 'broadcasts'
  );
}

export function pathForConvertStep(id: ConvertStepId): string {
  return `${CONVERT_BASE_PATH}/${id}`;
}

/**
 * Resolve a URL slug into a step + index. Returns null when the slug names an
 * unknown step or one hidden for this run (the shell then redirects to intro).
 * An empty slug resolves to the first step.
 */
export function resolveConvertSlug(
  slug: string[] | undefined,
  steps: ConvertStepId[]
): ResolvedConvertStep | null {
  const id = slug && slug.length > 0 ? slug[0] : steps[0];
  const index = steps.findIndex((s) => s === id);
  if (index < 0) return null;
  return {
    id: steps[index],
    index,
    count: steps.length,
    isLast: index === steps.length - 1,
  };
}

/** Path of the next step, or null when the current step is terminal. */
export function nextConvertPath(
  current: ResolvedConvertStep,
  steps: ConvertStepId[]
): string | null {
  // Re-look-up by id so a `current` resolved against a different list (e.g.
  // broadcasts flipping visible between renders) still walks `steps`.
  const idx = steps.findIndex((s) => s === current.id);
  if (idx < 0 || idx >= steps.length - 1) return null;
  return pathForConvertStep(steps[idx + 1]);
}

/** Path of the previous step, or null at the very first step. */
export function previousConvertPath(
  current: ResolvedConvertStep,
  steps: ConvertStepId[]
): string | null {
  const idx = steps.findIndex((s) => s === current.id);
  if (idx <= 0) return null;
  return pathForConvertStep(steps[idx - 1]);
}
