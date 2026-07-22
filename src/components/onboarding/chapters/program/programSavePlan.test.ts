import { describe, expect, test } from 'bun:test';
import {
  MAX_SWITCH_CUSTOMERS,
  buildProgramSavePlan,
  type ProgramSavePlanInput,
} from './programSavePlan';
import type { LoyaltyProgram, RewardTier } from '@/types';

const STAMP_PROGRAM = {
  id: 'prog1',
  type: 'stamp',
  config: { total_stamps: 10, stackable_rewards: false },
} as unknown as LoyaltyProgram;

const POINTS_PROGRAM = {
  id: 'prog1',
  type: 'points',
  config: {
    points_per_currency_unit: 1,
    rewards: [{ id: 'r1', name: 'Coffee', threshold: 100 }],
  },
} as unknown as LoyaltyProgram;

const POINTS_REWARDS: RewardTier[] = [{ id: 'r1', name: 'Coffee', threshold: 100 }];

function stampSnapshot(overrides: Partial<ProgramSavePlanInput['snapshot']> = {}) {
  return {
    programName: 'My program',
    loyaltyType: 'stamps' as const,
    totalStamps: 10,
    rewardName: 'Free coffee',
    stackableRewards: false,
    maxStackedRewards: null,
    initialStamps: 0,
    pointsRate: 1,
    pointsRewards: POINTS_REWARDS,
    maxBalance: null,
    ...overrides,
  };
}

function pointsSnapshot(overrides: Partial<ProgramSavePlanInput['snapshot']> = {}) {
  return stampSnapshot({ loyaltyType: 'points', ...overrides });
}

describe('buildProgramSavePlan — validation', () => {
  test('no program → invalid', () => {
    expect(
      buildProgramSavePlan({
        program: null,
        snapshot: stampSnapshot(),
        isDirty: true,
        customerCount: 0,
      })
    ).toEqual({ kind: 'invalid', reason: 'noProgram' });
  });

  test('empty program name → invalid', () => {
    expect(
      buildProgramSavePlan({
        program: STAMP_PROGRAM,
        snapshot: stampSnapshot({ programName: '  ' }),
        isDirty: true,
        customerCount: 0,
      })
    ).toEqual({ kind: 'invalid', reason: 'programNameRequired' });
  });

  test('stamp program missing reward name → invalid', () => {
    expect(
      buildProgramSavePlan({
        program: STAMP_PROGRAM,
        snapshot: stampSnapshot({ rewardName: '' }),
        isDirty: true,
        customerCount: 0,
      })
    ).toEqual({ kind: 'invalid', reason: 'rewardRequired' });
  });

  test('points program with invalid config → invalid', () => {
    expect(
      buildProgramSavePlan({
        program: POINTS_PROGRAM,
        snapshot: pointsSnapshot({ pointsRate: 0 }),
        isDirty: true,
        customerCount: 0,
      })
    ).toEqual({ kind: 'invalid', reason: 'pointsInvalid' });
  });
});

describe('buildProgramSavePlan — noop', () => {
  test('not dirty and valid → noop', () => {
    expect(
      buildProgramSavePlan({
        program: STAMP_PROGRAM,
        snapshot: stampSnapshot(),
        isDirty: false,
        customerCount: 0,
      })
    ).toEqual({ kind: 'noop' });
  });
});

describe('buildProgramSavePlan — update (same type)', () => {
  test('stamp edit merges config and clamps prestamp', () => {
    const plan = buildProgramSavePlan({
      program: STAMP_PROGRAM,
      snapshot: stampSnapshot({ totalStamps: 8, initialStamps: 12, stackableRewards: true }),
      isDirty: true,
      customerCount: 0,
    });
    expect(plan.kind).toBe('update');
    if (plan.kind !== 'update') throw new Error('expected update');
    expect(plan.programId).toBe('prog1');
    expect(plan.data.reward_name).toBe('Free coffee');
    expect(plan.data.config).toMatchObject({
      total_stamps: 8,
      stackable_rewards: true,
      initial_stamps: 7, // clamped to total-1
      user_configured: true,
    });
  });

  test('points edit sets reward_name null and merges points config', () => {
    const plan = buildProgramSavePlan({
      program: POINTS_PROGRAM,
      snapshot: pointsSnapshot({ pointsRate: 2, maxBalance: 500 }),
      isDirty: true,
      customerCount: 0,
    });
    expect(plan.kind).toBe('update');
    if (plan.kind !== 'update') throw new Error('expected update');
    expect(plan.data.reward_name).toBeNull();
    expect(plan.data.config).toMatchObject({
      points_per_currency_unit: 2,
      max_balance: 500,
      user_configured: true,
    });
  });
});

describe('buildProgramSavePlan — convert (type changed, in place)', () => {
  test('stamp → points converts, needsConfirm when customers exist', () => {
    const plan = buildProgramSavePlan({
      program: STAMP_PROGRAM,
      snapshot: pointsSnapshot(),
      isDirty: true,
      customerCount: 1,
    });
    expect(plan.kind).toBe('convert');
    if (plan.kind !== 'convert') throw new Error('expected convert');
    expect(plan.needsConfirm).toBe(true);
    expect(plan.customerCount).toBe(1);
    expect(plan.data.toType).toBe('points');
    expect(plan.data.rewardName).toBeNull();
    expect(plan.data.config).toMatchObject({ points_per_currency_unit: 1 });
    // Convert reuses the card in place — there is no delete/replace flag.
    expect('replace_enrollments' in plan.data).toBe(false);
  });

  test('points → stamp with zero customers: no confirm', () => {
    const plan = buildProgramSavePlan({
      program: POINTS_PROGRAM,
      snapshot: stampSnapshot(),
      isDirty: true,
      customerCount: 0,
    });
    expect(plan.kind).toBe('convert');
    if (plan.kind !== 'convert') throw new Error('expected convert');
    expect(plan.needsConfirm).toBe(false);
    expect(plan.data.toType).toBe('stamp');
    expect(plan.data.rewardName).toBe('Free coffee');
  });

  test('at the cap (3 customers) still converts with confirm', () => {
    const plan = buildProgramSavePlan({
      program: STAMP_PROGRAM,
      snapshot: pointsSnapshot(),
      isDirty: true,
      customerCount: MAX_SWITCH_CUSTOMERS,
    });
    expect(plan.kind).toBe('convert');
    if (plan.kind !== 'convert') throw new Error('expected convert');
    expect(plan.needsConfirm).toBe(true);
  });
});

describe('buildProgramSavePlan — blocked (too many customers)', () => {
  test('above the cap → blocked, no convert', () => {
    expect(
      buildProgramSavePlan({
        program: STAMP_PROGRAM,
        snapshot: pointsSnapshot(),
        isDirty: true,
        customerCount: MAX_SWITCH_CUSTOMERS + 1,
      })
    ).toEqual({ kind: 'blocked', customerCount: MAX_SWITCH_CUSTOMERS + 1 });
  });

  test('same-type edit is never blocked regardless of customer count', () => {
    const plan = buildProgramSavePlan({
      program: STAMP_PROGRAM,
      snapshot: stampSnapshot({ totalStamps: 8 }),
      isDirty: true,
      customerCount: 99,
    });
    expect(plan.kind).toBe('update');
  });
});
