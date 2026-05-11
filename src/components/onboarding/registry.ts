import type { ChapterDef, ResolvedStep, SubStepDef } from './types';
import { WelcomeStep } from './chapters/welcome/WelcomeStep';
import { IdentityStep } from './chapters/business/IdentityStep';
import { TypeStep } from './chapters/business/TypeStep';
import { SizeStep } from './chapters/business/SizeStep';
import { LocationsStep } from './chapters/business/LocationsStep';
import { ObjectivesStep } from './chapters/business/ObjectivesStep';
import { ProgramStep } from './chapters/program/ProgramStep';
import { DataCollectionStep } from './chapters/data-collection/DataCollectionStep';
import { BrandingStep } from './chapters/design/BrandingStep';
import { IconStep } from './chapters/notifications/IconStep';
import { TransactionalStep } from './chapters/notifications/TransactionalStep';
import { MilestonesStep } from './chapters/notifications/MilestonesStep';
import { FirstCustomerStep } from './chapters/first-customer/FirstCustomerStep';
import { LiveStampStep } from './chapters/live-stamp/LiveStampStep';
import { FirstBroadcastStep } from './chapters/first-broadcast/FirstBroadcastStep';
import { TeamStep } from './chapters/team/TeamStep';
import { PlanStep } from './chapters/plan/PlanStep';

/**
 * Ordered list of wizard chapters. Adding or reordering a sub-step is a single
 * edit here — no route file needs to change because the wizard route is a
 * catch-all that dispatches by slug.
 *
 * `required: true` means the sub-step cannot be individually skipped. Once all
 * required sub-steps are in `setup_progress.completed`, the footer surfaces
 * "Skip rest of setup."
 *
 * Coverage of the plan's 11-chapter map at this point:
 *  - Ch 1 Welcome ✓
 *  - Ch 2 Business: Identity only (Type/Size/Locations/Objectives TODO)
 *  - Ch 3 Program ✓
 *  - Ch 4 Data collection ✓
 *  - Ch 5 Design: Branding only (Stamps/Content/Back TODO)
 *  - Ch 6 Notifications: TODO
 *  - Ch 7 First customer: TODO
 *  - Ch 8 Live stamp: TODO
 *  - Ch 9 First broadcast: TODO
 *  - Ch 10 Team: TODO
 *  - Ch 11 Plan: TODO
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
      { id: 'type', required: false, Component: TypeStep },
      { id: 'size', required: false, Component: SizeStep },
      { id: 'locations', required: false, Component: LocationsStep },
      { id: 'objectives', required: false, Component: ObjectivesStep },
    ],
  },
  {
    id: 'program',
    subSteps: [{ id: 'program', required: true, Component: ProgramStep }],
  },
  {
    id: 'data-collection',
    subSteps: [{ id: 'data-collection', required: false, Component: DataCollectionStep }],
  },
  {
    id: 'design',
    subSteps: [
      { id: 'branding', required: true, Component: BrandingStep },
    ],
  },
  {
    id: 'notifications',
    subSteps: [
      { id: 'icon', required: false, Component: IconStep },
      { id: 'transactional', required: false, Component: TransactionalStep },
      { id: 'milestones', required: false, Component: MilestonesStep },
    ],
  },
  {
    id: 'first-customer',
    subSteps: [{ id: 'first-customer', required: false, Component: FirstCustomerStep }],
  },
  {
    id: 'live-stamp',
    subSteps: [{ id: 'live-stamp', required: false, Component: LiveStampStep }],
  },
  {
    id: 'first-broadcast',
    subSteps: [{ id: 'first-broadcast', required: false, Component: FirstBroadcastStep }],
  },
  {
    id: 'team',
    subSteps: [{ id: 'team', required: false, Component: TeamStep }],
  },
  {
    id: 'plan',
    subSteps: [{ id: 'plan', required: false, Component: PlanStep }],
  },
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
