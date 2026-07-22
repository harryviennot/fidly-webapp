import { describe, expect, test } from 'bun:test';
import {
  CONVERT_STEP_ORDER,
  getVisibleSteps,
  nextConvertPath,
  pathForConvertStep,
  previousConvertPath,
  resolveConvertSlug,
} from './registry';

describe('getVisibleSteps', () => {
  test('includes the broadcasts step only when the preview reported affected broadcasts', () => {
    expect(getVisibleSteps(true)).toEqual([
      'intro',
      'program',
      'design',
      'customers',
      'notifications',
      'broadcasts',
      'review',
      'execute',
    ]);
    expect(getVisibleSteps(false)).toEqual([
      'intro',
      'program',
      'design',
      'customers',
      'notifications',
      'review',
      'execute',
    ]);
  });

  test('full order matches the registry constant', () => {
    expect(getVisibleSteps(true)).toEqual([...CONVERT_STEP_ORDER]);
  });
});

describe('resolveConvertSlug', () => {
  const visible = getVisibleSteps(false);

  test('empty slug resolves to the intro step', () => {
    const resolved = resolveConvertSlug(undefined, visible);
    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe('intro');
    expect(resolved!.index).toBe(0);
    expect(resolved!.isLast).toBe(false);
  });

  test('resolves a named step with its index in the visible list', () => {
    const resolved = resolveConvertSlug(['review'], visible);
    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe('review');
    // broadcasts hidden: intro, program, design, customers, notifications, review
    expect(resolved!.index).toBe(5);
    expect(resolved!.count).toBe(7);
  });

  test('unknown slug resolves to null', () => {
    expect(resolveConvertSlug(['nope'], visible)).toBeNull();
  });

  test('broadcasts resolves only when visible', () => {
    expect(resolveConvertSlug(['broadcasts'], visible)).toBeNull();
    const withBroadcasts = resolveConvertSlug(['broadcasts'], getVisibleSteps(true));
    expect(withBroadcasts).not.toBeNull();
    expect(withBroadcasts!.id).toBe('broadcasts');
  });

  test('execute resolves as the terminal step', () => {
    const resolved = resolveConvertSlug(['execute'], visible);
    expect(resolved).not.toBeNull();
    expect(resolved!.isLast).toBe(true);
  });
});

describe('pathForConvertStep', () => {
  test('builds /convert paths', () => {
    expect(pathForConvertStep('intro')).toBe('/convert/intro');
    expect(pathForConvertStep('execute')).toBe('/convert/execute');
  });
});

describe('nextConvertPath / previousConvertPath', () => {
  test('walks forward through the visible list, skipping hidden broadcasts', () => {
    const visible = getVisibleSteps(false);
    const notifications = resolveConvertSlug(['notifications'], visible)!;
    expect(nextConvertPath(notifications, visible)).toBe('/convert/review');
  });

  test('includes broadcasts when visible', () => {
    const visible = getVisibleSteps(true);
    const notifications = resolveConvertSlug(['notifications'], visible)!;
    expect(nextConvertPath(notifications, visible)).toBe('/convert/broadcasts');
    const broadcasts = resolveConvertSlug(['broadcasts'], visible)!;
    expect(nextConvertPath(broadcasts, visible)).toBe('/convert/review');
  });

  test('review advances to execute; execute is terminal', () => {
    const visible = getVisibleSteps(false);
    const review = resolveConvertSlug(['review'], visible)!;
    expect(nextConvertPath(review, visible)).toBe('/convert/execute');
    const execute = resolveConvertSlug(['execute'], visible)!;
    expect(nextConvertPath(execute, visible)).toBeNull();
  });

  test('walks backward and stops at intro', () => {
    const visible = getVisibleSteps(false);
    const program = resolveConvertSlug(['program'], visible)!;
    expect(previousConvertPath(program, visible)).toBe('/convert/intro');
    const intro = resolveConvertSlug(['intro'], visible)!;
    expect(previousConvertPath(intro, visible)).toBeNull();
    const review = resolveConvertSlug(['review'], visible)!;
    expect(previousConvertPath(review, visible)).toBe('/convert/notifications');
  });
});
