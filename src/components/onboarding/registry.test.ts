import { describe, expect, test } from 'bun:test';
import {
  WIZARD_CHAPTERS,
  getStepCtaKey,
  getSubStepTitleKey,
  getVisibleChapters,
  isRequiredFloorMet,
  nextStepPath,
  previousStepPath,
  resolveSlug,
} from './registry';
import type { BusinessSettings } from '@/types/business';

describe('getVisibleChapters', () => {
  test('keeps every chapter for a team business', () => {
    const chapters = getVisibleChapters({ team_size: 'team' } as BusinessSettings);
    expect(chapters.map((c) => c.id)).toEqual(WIZARD_CHAPTERS.map((c) => c.id));
  });

  test('hides the team chapter for a solo owner (from settings)', () => {
    const chapters = getVisibleChapters({ team_size: 'solo' } as BusinessSettings);
    expect(chapters.some((c) => c.id === 'team')).toBe(false);
  });

  test('draft team size takes precedence over persisted settings', () => {
    // Settings still say solo (background save pending), draft says team.
    const chapters = getVisibleChapters(
      { team_size: 'solo' } as BusinessSettings,
      'team'
    );
    expect(chapters.some((c) => c.id === 'team')).toBe(true);
  });

  test('returns a non-empty list when settings are null', () => {
    expect(getVisibleChapters(null).length).toBeGreaterThan(0);
  });
});

describe('resolveSlug', () => {
  const visible = getVisibleChapters({ team_size: 'team' } as BusinessSettings);

  test('empty slug resolves to the welcome chapter', () => {
    const resolved = resolveSlug(undefined, visible);
    expect(resolved).not.toBeNull();
    expect(resolved!.chapter.id).toBe('welcome');
    expect(resolved!.isLast).toBe(false);
  });

  test('legacy v2 slugs remap onto v3 chapters', () => {
    expect(resolveSlug(['first-customer'], visible)!.chapter.id).toBe('first-stamp');
    expect(resolveSlug(['first-customer'], visible)!.subStep.id).toBe('install');
    expect(resolveSlug(['live-stamp'], visible)!.subStep.id).toBe('stamp');
    expect(resolveSlug(['backfields'], visible)!.chapter.id).toBe('card-back');
    expect(resolveSlug(['data-collection'], visible)!.chapter.id).toBe('program');
    expect(resolveSlug(['data-collection'], visible)!.subStep.id).toBe('data-collection');
  });

  test('a single-substep chapter accepts the bare chapter id', () => {
    const resolved = resolveSlug(['recap'], visible);
    expect(resolved).not.toBeNull();
    expect(resolved!.subStep.id).toBe('recap');
  });

  test('a multi-substep chapter resolves the named sub-step', () => {
    const resolved = resolveSlug(['design', 'stamps'], visible);
    expect(resolved!.chapter.id).toBe('design');
    expect(resolved!.subStep.id).toBe('stamps');
  });

  test('unknown chapter and unknown sub-step both resolve to null', () => {
    expect(resolveSlug(['nope'], visible)).toBeNull();
    expect(resolveSlug(['design', 'nope'], visible)).toBeNull();
  });

  test('the plan chapter is the terminal step', () => {
    expect(resolveSlug(['plan'], visible)!.isLast).toBe(true);
  });

  test('team resolves as unknown for a solo owner (hidden list)', () => {
    const solo = getVisibleChapters({ team_size: 'solo' } as BusinessSettings);
    expect(resolveSlug(['team'], solo)).toBeNull();
  });
});

describe('nextStepPath / previousStepPath', () => {
  const visible = getVisibleChapters({ team_size: 'team' } as BusinessSettings);

  test('walks forward within a chapter then crosses the boundary', () => {
    const branding = resolveSlug(['design', 'branding'], visible)!;
    expect(nextStepPath(branding, visible)).toBe('/onboarding/business/design/stamps');
    // notifications' sole sub-step is 'icon' (id != chapter id), so the path
    // carries the sub-step segment.
    const back = resolveSlug(['design', 'back'], visible)!;
    expect(nextStepPath(back, visible)).toBe('/onboarding/business/notifications/icon');
  });

  test('walks backward across a chapter boundary', () => {
    const program = resolveSlug(['program', 'program'], visible)!;
    expect(previousStepPath(program, visible)).toBe('/onboarding/business/business/profile');
  });

  test('nulls at both ends', () => {
    const welcome = resolveSlug(['welcome'], visible)!;
    expect(previousStepPath(welcome, visible)).toBeNull();
    const plan = resolveSlug(['plan'], visible)!;
    expect(nextStepPath(plan, visible)).toBeNull();
  });

  test('solo owner hops over the hidden team chapter', () => {
    const solo = getVisibleChapters({ team_size: 'solo' } as BusinessSettings);
    const compose = resolveSlug(['first-broadcast', 'compose'], solo)!;
    expect(nextStepPath(compose, solo)).toBe('/onboarding/business/recap');
    const recap = resolveSlug(['recap'], solo)!;
    expect(previousStepPath(recap, solo)).toBe('/onboarding/business/first-broadcast/compose');
  });
});

describe('isRequiredFloorMet', () => {
  const required = [
    { chapter: 'business', step: 'identity' },
    { chapter: 'business', step: 'profile' },
    { chapter: 'program', step: 'program' },
    { chapter: 'design', step: 'branding' },
  ];

  test('false until every required sub-step is completed', () => {
    expect(isRequiredFloorMet(required.slice(0, 3))).toBe(false);
  });

  test('true once all required sub-steps are present', () => {
    expect(isRequiredFloorMet(required)).toBe(true);
  });
});

describe('getSubStepTitleKey', () => {
  test('stamp program uses the plain title key', () => {
    expect(getSubStepTitleKey('first-stamp', 'stamp', false)).toBe(
      'chapters.first-stamp.steps.stamp.title'
    );
  });

  test('points program swaps to the points title on the first-stamp step', () => {
    expect(getSubStepTitleKey('first-stamp', 'stamp', true)).toBe(
      'chapters.first-stamp.steps.stamp.points.title'
    );
  });

  test('points variant only applies to the first-stamp stamp step', () => {
    expect(getSubStepTitleKey('design', 'branding', true)).toBe(
      'chapters.design.steps.branding.title'
    );
  });
});

describe('getStepCtaKey', () => {
  test('builds the footer CTA key', () => {
    expect(getStepCtaKey('design', 'branding')).toBe('footer.cta.design.branding');
  });
});
