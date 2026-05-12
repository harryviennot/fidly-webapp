import type { ChapterDef, ResolvedStep, SubStepDef } from './types';
import { WelcomeStep } from './chapters/welcome/WelcomeStep';
import { IdentityStep } from './chapters/business/IdentityStep';
import { ProfileStep } from './chapters/business/ProfileStep';
import { ProgramStep } from './chapters/program/ProgramStep';
import { DataCollectionStep } from './chapters/data-collection/DataCollectionStep';
import { IntroStep as CardBackIntroStep } from './chapters/card-back/IntroStep';
import { InfoStep as CardBackInfoStep } from './chapters/card-back/InfoStep';
import { BrandingStep } from './chapters/design/BrandingStep';
import { StampsStep } from './chapters/design/StampsStep';
import { ContentStep } from './chapters/design/ContentStep';
import { BackStep } from './chapters/design/BackStep';
import { IconStep } from './chapters/notifications/IconStep';
import { InstallStep as FirstStampInstallStep } from './chapters/first-stamp/InstallStep';
import { StampStep as FirstStampStampStep } from './chapters/first-stamp/StampStep';
import { IntroStep as FirstBroadcastIntroStep } from './chapters/first-broadcast/IntroStep';
import { ComposeStep as FirstBroadcastComposeStep } from './chapters/first-broadcast/ComposeStep';
import { TeamStep } from './chapters/team/TeamStep';
import { RecapStep } from './chapters/recap/RecapStep';
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
 * v3 shape:
 *   welcome → business [identity, profile] → program → data-collection
 *   → card-back [intro, info] → design [branding, stamps, content, back]
 *   → notifications [icon] → first-stamp [install, stamp]
 *   → first-broadcast [intro, compose] → team → recap → plan
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
      { id: 'profile', required: false, Component: ProfileStep },
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
    id: 'card-back',
    subSteps: [
      { id: 'intro', required: false, Component: CardBackIntroStep },
      { id: 'info', required: false, Component: CardBackInfoStep },
    ],
  },
  {
    id: 'design',
    subSteps: [
      { id: 'branding', required: true, Component: BrandingStep },
      { id: 'stamps', required: false, Component: StampsStep },
      { id: 'content', required: false, Component: ContentStep },
      { id: 'back', required: false, Component: BackStep },
    ],
  },
  {
    id: 'notifications',
    subSteps: [{ id: 'icon', required: false, Component: IconStep }],
  },
  {
    id: 'first-stamp',
    subSteps: [
      { id: 'install', required: false, Component: FirstStampInstallStep },
      { id: 'stamp', required: false, Component: FirstStampStampStep },
    ],
  },
  {
    id: 'first-broadcast',
    subSteps: [
      { id: 'intro', required: false, Component: FirstBroadcastIntroStep },
      { id: 'compose', required: false, Component: FirstBroadcastComposeStep },
    ],
  },
  {
    id: 'team',
    subSteps: [{ id: 'team', required: false, Component: TeamStep }],
  },
  {
    id: 'recap',
    subSteps: [{ id: 'recap', required: false, Component: RecapStep }],
  },
  {
    id: 'plan',
    subSteps: [{ id: 'plan', required: false, Component: PlanStep }],
  },
];

export const TOTAL_CHAPTERS = WIZARD_CHAPTERS.length;

/**
 * Legacy slug map for v2 → v3 chapter renames. Owners with an in-flight
 * `setup_progress.last_step` referencing v2 paths re-anchor here so they don't
 * land on an "unknown step" screen.
 *
 * Drop after roughly two weeks once any pending wizards have either completed
 * or been touched again.
 */
const LEGACY_SLUG_MAP: Record<string, [string, string]> = {
  'first-customer': ['first-stamp', 'install'],
  'live-stamp': ['first-stamp', 'stamp'],
  backfields: ['card-back', 'info'],
};

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
 *
 * v2 → v3 slugs are remapped silently (see `LEGACY_SLUG_MAP`).
 */
export function resolveSlug(slug: string[] | undefined): ResolvedStep | null {
  const segments = slug && slug.length > 0 ? slug : [WIZARD_CHAPTERS[0].id];
  let [chapterId, stepId] = segments;

  if (chapterId in LEGACY_SLUG_MAP) {
    [chapterId, stepId] = LEGACY_SLUG_MAP[chapterId];
  }

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
