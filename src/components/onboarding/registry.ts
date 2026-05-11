import type { ChapterDef, ResolvedStep, SubStepDef } from './types';
import { WelcomeStep } from './chapters/welcome/WelcomeStep';
import { IdentityStep } from './chapters/business/IdentityStep';

/**
 * Ordered list of wizard chapters. Adding or reordering a sub-step is a single
 * edit here — no route file needs to change because the wizard route is a
 * catch-all that dispatches by slug.
 *
 * `required: true` means the sub-step cannot be individually skipped. Once all
 * required sub-steps are in `setup_progress.completed`, the footer surfaces
 * "Skip rest of setup."
 */
export const WIZARD_CHAPTERS: ChapterDef[] = [
  {
    id: 'welcome',
    subSteps: [{ id: 'welcome', required: false, Component: WelcomeStep }],
  },
  {
    id: 'business',
    subSteps: [
      { id: 'identity', required: true, Component: IdentityStep },
      // TODO: type, size, locations, objectives — added in subsequent tasks
    ],
  },
  // TODO subsequent chapters: program, data-collection, design, notifications,
  // first-customer, live-stamp, first-broadcast, team, plan
];

export const TOTAL_CHAPTERS = WIZARD_CHAPTERS.length;

export function findChapter(chapterId: string): ChapterDef | undefined {
  return WIZARD_CHAPTERS.find((c) => c.id === chapterId);
}

export function findSubStep(chapter: ChapterDef, stepId?: string): SubStepDef | undefined {
  if (!stepId) return chapter.subSteps[0];
  return chapter.subSteps.find((s) => s.id === stepId);
}

/**
 * Resolve a URL slug into chapter + sub-step + indices. Returns null when the
 * slug doesn't match any registered chapter/sub-step.
 *
 * Single-sub-step chapters accept either `[chapterId]` or `[chapterId, stepId]`.
 * Multi-sub-step chapters require `[chapterId, stepId]`.
 */
export function resolveSlug(slug: string[] | undefined): ResolvedStep | null {
  const segments = slug && slug.length > 0 ? slug : [WIZARD_CHAPTERS[0].id];
  const [chapterId, stepId] = segments;
  const chapterIndex = WIZARD_CHAPTERS.findIndex((c) => c.id === chapterId);
  if (chapterIndex < 0) return null;
  const chapter = WIZARD_CHAPTERS[chapterIndex];

  const subStepIndex = stepId
    ? chapter.subSteps.findIndex((s) => s.id === stepId)
    : 0;
  if (subStepIndex < 0) return null;

  const isLastChapter = chapterIndex === WIZARD_CHAPTERS.length - 1;
  const isLastSubStep = subStepIndex === chapter.subSteps.length - 1;

  return {
    chapter,
    subStep: chapter.subSteps[subStepIndex],
    chapterIndex,
    subStepIndex,
    isLast: isLastChapter && isLastSubStep,
  };
}

export function pathForStep(chapter: ChapterDef, subStep: SubStepDef): string {
  if (chapter.subSteps.length === 1 && chapter.subSteps[0].id === chapter.id) {
    return `/onboarding/business/${chapter.id}`;
  }
  return `/onboarding/business/${chapter.id}/${subStep.id}`;
}

/** Path to navigate to when advancing from the current step. Returns null when there is no next step. */
export function nextStepPath(current: ResolvedStep): string | null {
  const { chapter, chapterIndex, subStepIndex } = current;
  if (subStepIndex < chapter.subSteps.length - 1) {
    return pathForStep(chapter, chapter.subSteps[subStepIndex + 1]);
  }
  const nextChapter = WIZARD_CHAPTERS[chapterIndex + 1];
  if (!nextChapter) return null;
  return pathForStep(nextChapter, nextChapter.subSteps[0]);
}

/** Path to navigate to when going back. Returns null when at the very first step. */
export function previousStepPath(current: ResolvedStep): string | null {
  const { chapter, chapterIndex, subStepIndex } = current;
  if (subStepIndex > 0) {
    return pathForStep(chapter, chapter.subSteps[subStepIndex - 1]);
  }
  const prevChapter = WIZARD_CHAPTERS[chapterIndex - 1];
  if (!prevChapter) return null;
  const lastSub = prevChapter.subSteps[prevChapter.subSteps.length - 1];
  return pathForStep(prevChapter, lastSub);
}

/**
 * Check whether all required sub-steps across all chapters are in the
 * `completed` list. Used to gate the "Skip rest of setup" affordance.
 */
export function isRequiredFloorMet(
  completed: Array<{ chapter: string; step?: string }>
): boolean {
  for (const chapter of WIZARD_CHAPTERS) {
    for (const sub of chapter.subSteps) {
      if (!sub.required) continue;
      const found = completed.some(
        (c) => c.chapter === chapter.id && (c.step ?? '') === sub.id
      );
      if (!found) return false;
    }
  }
  return true;
}
