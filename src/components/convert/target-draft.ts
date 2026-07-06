/**
 * The target-program draft: which wizard-draft keys hold it, its defaults
 * (seeded from the LIVE program so the owner starts from something familiar),
 * and a reader that assembles a full `TargetProgramDraft` for the preview /
 * convert payloads. Pure — tested in `target-draft.test.ts`.
 */

import { isPointsProgram, isStampProgram } from '@/types';
import type { LoyaltyProgram, LoyaltyType, RewardTier } from '@/types';
import type { TargetProgramDraft } from './assemble';

/** Wizard-draft keys for the program step (namespaced like onboarding's). */
export const TARGET_DRAFT_KEYS = {
  totalStamps: 'program.totalStamps',
  rewardName: 'program.rewardName',
  stackableRewards: 'program.stackableRewards',
  maxStackedRewards: 'program.maxStackedRewards',
  initialStamps: 'program.initialStamps',
  pointsRate: 'program.pointsRate',
  pointsRewards: 'program.pointsRewards',
  maxBalance: 'program.maxBalance',
} as const;

function cheapestReward(rewards: RewardTier[]): RewardTier | null {
  const priced = rewards.filter((r) => r.threshold > 0);
  if (priced.length === 0) return null;
  return priced.reduce((min, r) => (r.threshold < min.threshold ? r : min));
}

export function targetDraftDefaults(
  toType: LoyaltyType,
  program: LoyaltyProgram
): TargetProgramDraft {
  const oldRewardName = program.reward_name?.trim() || '';
  const oldPointsRewards = isPointsProgram(program) ? program.config.rewards ?? [] : [];

  return {
    toType,
    // Stamp target: a familiar 10-stamp card; the reward keeps the name of the
    // cheapest reward on the old points menu (the closest equivalent).
    totalStamps: 10,
    rewardName:
      toType === 'stamp'
        ? cheapestReward(oldPointsRewards)?.name ?? oldRewardName
        : oldRewardName,
    stackableRewards: false,
    maxStackedRewards: null,
    initialStamps: 0,
    // Points target: 1 point per currency unit, one starter reward carrying
    // the old stamp program's reward name at a round 100-point price.
    pointsRate: 1,
    pointsRewards:
      toType === 'points'
        ? [{ id: 'r_default', name: oldRewardName || 'Reward', threshold: 100 }]
        : [],
    maxBalance: null,
  };
}

/** Read the drafted target program, falling back to the defaults for any key
 * the owner never touched. `get` is the wizard draft-store getter. */
export function readTargetDraft(
  get: <T>(key: string) => T | undefined,
  toType: LoyaltyType,
  program: LoyaltyProgram
): TargetProgramDraft {
  const d = targetDraftDefaults(toType, program);
  return {
    toType,
    totalStamps: get<number>(TARGET_DRAFT_KEYS.totalStamps) ?? d.totalStamps,
    rewardName: get<string>(TARGET_DRAFT_KEYS.rewardName) ?? d.rewardName,
    stackableRewards:
      get<boolean>(TARGET_DRAFT_KEYS.stackableRewards) ?? d.stackableRewards,
    maxStackedRewards:
      get<number | null>(TARGET_DRAFT_KEYS.maxStackedRewards) !== undefined
        ? (get<number | null>(TARGET_DRAFT_KEYS.maxStackedRewards) as number | null)
        : d.maxStackedRewards,
    initialStamps: get<number>(TARGET_DRAFT_KEYS.initialStamps) ?? d.initialStamps,
    pointsRate: get<number>(TARGET_DRAFT_KEYS.pointsRate) ?? d.pointsRate,
    pointsRewards: get<RewardTier[]>(TARGET_DRAFT_KEYS.pointsRewards) ?? d.pointsRewards,
    maxBalance:
      get<number | null>(TARGET_DRAFT_KEYS.maxBalance) !== undefined
        ? (get<number | null>(TARGET_DRAFT_KEYS.maxBalance) as number | null)
        : d.maxBalance,
  };
}

/** What the LIVE program contributes to the rate suggestion (see assemble). */
export function currentProgramShape(program: LoyaltyProgram): {
  totalStamps: number;
  pointsRewards: RewardTier[];
} {
  return {
    totalStamps: isStampProgram(program) ? program.config.total_stamps ?? 10 : 10,
    pointsRewards: isPointsProgram(program) ? program.config.rewards ?? [] : [],
  };
}
