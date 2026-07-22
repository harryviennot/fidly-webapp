import { describe, expect, test } from 'bun:test';
import type { RewardTier } from '@/types';
import { maxBalanceFloor } from './points-config';

const REWARDS: RewardTier[] = [
  { id: 'r1', threshold: 100, name: 'Coffee' },
  { id: 'r2', threshold: 800, name: 'Dinner' },
];

describe('maxBalanceFloor', () => {
  test('is the priciest reward threshold', () => {
    expect(maxBalanceFloor(REWARDS)).toBe(800);
  });

  test('ignores unpriced rewards and handles an empty menu', () => {
    expect(maxBalanceFloor([{ id: 'r', threshold: 0, name: 'Free' }])).toBe(1);
    expect(maxBalanceFloor([])).toBe(1);
  });
});
