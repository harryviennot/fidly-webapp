import { describe, expect, test } from 'bun:test';
import type { LoyaltyProgram } from '@/types';
import { readTargetDraft, targetDraftDefaults } from './target-draft';

const STAMP_PROGRAM = {
  id: 'p1',
  type: 'stamp',
  name: 'Loyalty',
  reward_name: 'Free coffee',
  config: { total_stamps: 12, stackable_rewards: true, max_stacked_rewards: 2, initial_stamps: 1 },
} as unknown as LoyaltyProgram;

const POINTS_PROGRAM = {
  id: 'p2',
  type: 'points',
  name: 'Loyalty',
  reward_name: null,
  config: {
    points_per_currency_unit: 2,
    max_balance: 500,
    rewards: [
      { id: 'r1', threshold: 120, name: 'Lunch' },
      { id: 'r2', threshold: 80, name: 'Espresso' },
    ],
  },
} as unknown as LoyaltyProgram;

describe('targetDraftDefaults', () => {
  test('stamp -> points seeds one reward from the old reward name', () => {
    const d = targetDraftDefaults('points', STAMP_PROGRAM);
    expect(d.toType).toBe('points');
    expect(d.pointsRate).toBe(1);
    expect(d.pointsRewards).toHaveLength(1);
    expect(d.pointsRewards[0].name).toBe('Free coffee');
    expect(d.pointsRewards[0].threshold).toBeGreaterThan(0);
    expect(d.maxBalance).toBeNull();
  });

  test('points -> stamp seeds the reward name from the cheapest old reward', () => {
    const d = targetDraftDefaults('stamp', POINTS_PROGRAM);
    expect(d.toType).toBe('stamp');
    expect(d.totalStamps).toBe(10);
    expect(d.rewardName).toBe('Espresso');
    expect(d.stackableRewards).toBe(false);
    expect(d.initialStamps).toBe(0);
  });
});

describe('readTargetDraft', () => {
  test('drafted values override the defaults, missing keys fall back', () => {
    const store: Record<string, unknown> = {
      'program.totalStamps': 8,
      'program.rewardName': 'Croissant',
    };
    const d = readTargetDraft(<T,>(k: string) => store[k] as T | undefined, 'stamp', POINTS_PROGRAM);
    expect(d.totalStamps).toBe(8);
    expect(d.rewardName).toBe('Croissant');
    // untouched keys keep the defaults
    expect(d.stackableRewards).toBe(false);
    expect(d.maxStackedRewards).toBeNull();
  });
});
