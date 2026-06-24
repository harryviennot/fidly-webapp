import type { BusinessSettings } from '@/types/business';
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
      { id: 'profile', required: true, Component: ProfileStep },
    ],
  },
  {
    // Loyalty-program chapter groups everything that lives on the dashboard's
    // /loyalty-program tab: the core mechanic + the data we collect from
    // customers when they sign up.
    id: 'program',
    subSteps: [
      { id: 'program', required: true, Component: ProgramStep },
      { id: 'data-collection', required: false, Component: DataCollectionStep },
    ],
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
 * Filter `WIZARD_CHAPTERS` based on step-2 answers. Currently:
 *   - `team_size === 'solo'` hides the entire `team` chapter so solo owners
 *     don't see the invite affordance. They can still re-enable team access
 *     from the dashboard later — this only shapes the wizard journey.
 *
 * The optional `draftTeamSize` arg is the wizard-draft mirror of the chip
 * selection (`profile.teamSize`). ProfileStep writes it synchronously while
 * the persisted `settings.team_size` is updated via a background save, so the
 * draft is "what the user just picked" and takes precedence. Falling back to
 * `settings` covers re-entry after the save lands and lets non-wizard callers
 * (which never set the draft) still get the right answer.
 *
 * Always returns a non-empty array. Pass the result through to `resolveSlug`,
 * `nextStepPath`, `previousStepPath`, and `isRequiredFloorMet` so navigation,
 * the progress bar, and the "required floor met" check all agree on which
 * chapters exist for this user.
 */
export function getVisibleChapters(
  settings: BusinessSettings | null | undefined,
  draftTeamSize?: string | null,
  /** Wizard-draft loyalty type ('stamps' | 'points'). Points cards have no
   *  stamp grid, so the design chapter's stamp sub-step is dropped. */
  loyaltyType?: string | null
): ChapterDef[] {
  const effectiveTeamSize = draftTeamSize || settings?.team_size;
  const isSolo = effectiveTeamSize === 'solo';

  let chapters = isSolo
    ? WIZARD_CHAPTERS.filter((c) => c.id !== 'team')
    : WIZARD_CHAPTERS;

  if (loyaltyType === 'points') {
    chapters = chapters.map((c) =>
      c.id === 'design'
        ? { ...c, subSteps: c.subSteps.filter((s) => s.id !== 'stamps') }
        : c
    );
  }

  return chapters;
}

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
  // v2 had a standalone /data-collection chapter; v3 nests it under the
  // loyalty program chapter to mirror the dashboard's tab grouping.
  'data-collection': ['program', 'data-collection'],
};

export function findChapter(
  chapterId: string,
  chapters: ChapterDef[] = WIZARD_CHAPTERS
): ChapterDef | undefined {
  return chapters.find((c) => c.id === chapterId);
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
 *
 * `chapters` defaults to the full registry; pass the filtered list returned by
 * `getVisibleChapters(settings)` so chapters hidden for the user (e.g. team for
 * solo) resolve as unknown — the wizard shell will then redirect away.
 */
export function resolveSlug(
  slug: string[] | undefined,
  chapters: ChapterDef[] = WIZARD_CHAPTERS
): ResolvedStep | null {
  const segments = slug && slug.length > 0 ? slug : [chapters[0].id];
  let [chapterId, stepId] = segments;

  if (chapterId in LEGACY_SLUG_MAP) {
    [chapterId, stepId] = LEGACY_SLUG_MAP[chapterId];
  }

  const chapterIndex = chapters.findIndex((c) => c.id === chapterId);
  if (chapterIndex < 0) return null;
  const chapter = chapters[chapterIndex];

  const subStepIndex = stepId
    ? chapter.subSteps.findIndex((s) => s.id === stepId)
    : 0;
  if (subStepIndex < 0) return null;

  const isLastChapter = chapterIndex === chapters.length - 1;
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
export function nextStepPath(
  current: ResolvedStep,
  chapters: ChapterDef[] = WIZARD_CHAPTERS
): string | null {
  const { chapter, subStepIndex } = current;
  if (subStepIndex < chapter.subSteps.length - 1) {
    return pathForStep(chapter, chapter.subSteps[subStepIndex + 1]);
  }
  // `current.chapterIndex` is relative to the chapter list it was resolved
  // against — re-look-up here so we walk the same list we were handed. Avoids
  // off-by-one bugs when a caller mixes `WIZARD_CHAPTERS` and the filtered
  // visible list.
  const idx = chapters.findIndex((c) => c.id === chapter.id);
  const nextChapter = idx >= 0 ? chapters[idx + 1] : undefined;
  if (!nextChapter) return null;
  return pathForStep(nextChapter, nextChapter.subSteps[0]);
}

/** Path to navigate to when going back. Returns null when at the very first step. */
export function previousStepPath(
  current: ResolvedStep,
  chapters: ChapterDef[] = WIZARD_CHAPTERS
): string | null {
  const { chapter, subStepIndex } = current;
  if (subStepIndex > 0) {
    return pathForStep(chapter, chapter.subSteps[subStepIndex - 1]);
  }
  const idx = chapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = idx > 0 ? chapters[idx - 1] : undefined;
  if (!prevChapter) return null;
  const lastSub = prevChapter.subSteps[prevChapter.subSteps.length - 1];
  return pathForStep(prevChapter, lastSub);
}

/**
 * Translate a chapter + sub-step pair into the i18n key for the wizard
 * footer's primary CTA. Centralised so every per-step label change is a
 * single edit in `onboarding-business.json` rather than a hunt across step
 * components. Steps that need to swap labels dynamically (e.g. broadcast's
 * "Send / Sent / Continue") still call `setNextLabel` themselves; this
 * provides the default the shell falls back to on slug change.
 */
export function getStepCtaKey(chapterId: string, subStepId: string): string {
  return `footer.cta.${chapterId}.${subStepId}`;
}

/**
 * Check whether all required sub-steps across all chapters are in the
 * `completed` list. Used to gate the "Skip rest of setup" affordance.
 */
export function isRequiredFloorMet(
  completed: Array<{ chapter: string; step?: string }>,
  chapters: ChapterDef[] = WIZARD_CHAPTERS
): boolean {
  for (const chapter of chapters) {
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
