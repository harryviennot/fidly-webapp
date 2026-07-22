import type { RewardTier } from '@/types';

/**
 * Lowest legal `max_balance` for a points program: the priciest reward's
 * threshold. Accrual stops at the cap, so a cap below that reward would make
 * it unreachable forever. Mirrors the backend rule in
 * `_validate_program_config` (which 422s below-floor caps as the backstop).
 * Returns 1 when the menu carries no priced reward.
 */
export function maxBalanceFloor(rewards: RewardTier[]): number {
  const priced = rewards.filter((r) => r.threshold > 0);
  if (priced.length === 0) return 1;
  return Math.max(...priced.map((r) => r.threshold));
}
