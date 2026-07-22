import type {
  LoyaltyProgram,
  LoyaltyType,
  ProgramConfig,
  RewardTier,
} from '@/types';

/**
 * Hard cap on how many customers an onboarding in-place type switch may
 * auto-convert. Mirror of the backend ONBOARDING_MAX_ENROLLMENTS
 * (backend/app/services/programs/rules.py) — keep the values in sync. Above
 * this the switch is blocked: a business scanning real customers must finish
 * setup and use the conversion wizard, never flip type casually mid-onboarding.
 */
export const MAX_SWITCH_CUSTOMERS = 3;

export interface ProgramSavePlanInput {
  program: Pick<LoyaltyProgram, 'id' | 'type' | 'config'> | null | undefined;
  snapshot: {
    programName: string;
    /** Chip id is plural; backend type is singular. */
    loyaltyType: 'stamps' | 'points';
    totalStamps: number;
    rewardName: string;
    stackableRewards: boolean;
    maxStackedRewards: number | null;
    initialStamps: number;
    pointsRate: number;
    pointsRewards: RewardTier[];
    maxBalance: number | null;
  };
  isDirty: boolean;
  customerCount: number;
}

type InvalidReason =
  | 'noProgram'
  | 'programNameRequired'
  | 'rewardRequired'
  | 'pointsInvalid';

interface UpdateData {
  name: string;
  config: ProgramConfig;
  reward_name: string | null;
}

/** Payload for the in-place type switch (POST /programs/{id}/switch-type). */
export interface SwitchTypeData {
  toType: LoyaltyType;
  config: ProgramConfig;
  rewardName: string | null;
}

export type ProgramSavePlan =
  | { kind: 'invalid'; reason: InvalidReason }
  | { kind: 'noop' }
  | { kind: 'update'; programId: string; data: UpdateData }
  | { kind: 'convert'; needsConfirm: boolean; customerCount: number; data: SwitchTypeData }
  | { kind: 'blocked'; customerCount: number };

function pointsConfigValid(rate: number, rewards: RewardTier[]): boolean {
  return (
    rate > 0 &&
    rewards.length >= 1 &&
    rewards.every((r) => r.name.trim().length > 0 && r.threshold > 0)
  );
}

/**
 * Decide what ProgramStep's submit does, given the drafted form state and how
 * many customers the business already has. Pure — the component turns the
 * verdict into a toast, a confirm dialog, an awaited in-place convert, or a
 * background update. See the onboarding type-switch doc for the full matrix.
 */
export function buildProgramSavePlan(input: ProgramSavePlanInput): ProgramSavePlan {
  const { program, snapshot, isDirty, customerCount } = input;
  const isPoints = snapshot.loyaltyType === 'points';

  // 1. Validate (mirrors the component's canProceed gate).
  if (!program?.id) return { kind: 'invalid', reason: 'noProgram' };
  if (!snapshot.programName.trim()) {
    return { kind: 'invalid', reason: 'programNameRequired' };
  }
  if (isPoints) {
    if (!pointsConfigValid(snapshot.pointsRate, snapshot.pointsRewards)) {
      return { kind: 'invalid', reason: 'pointsInvalid' };
    }
  } else if (!snapshot.rewardName.trim()) {
    return { kind: 'invalid', reason: 'rewardRequired' };
  }

  // 2. Nothing changed since the last save.
  if (!isDirty) return { kind: 'noop' };

  const targetType: LoyaltyType = isPoints ? 'points' : 'stamp';
  const typeChanged = targetType !== program.type;

  const config: ProgramConfig = isPoints
    ? {
        points_per_currency_unit: snapshot.pointsRate,
        rewards: snapshot.pointsRewards,
        max_balance: snapshot.maxBalance,
        user_configured: true,
      }
    : {
        total_stamps: snapshot.totalStamps,
        stackable_rewards: snapshot.stackableRewards,
        max_stacked_rewards: snapshot.maxStackedRewards,
        // Clamp defensively: the stepper caps live, but the goal can shrink
        // after the prestamp was drafted.
        initial_stamps: Math.max(
          0,
          Math.min(snapshot.initialStamps, snapshot.totalStamps - 1)
        ),
        user_configured: true,
      };
  const rewardName = isPoints ? null : snapshot.rewardName;

  // 3. Same type: a plain in-place update.
  if (!typeChanged) {
    return {
      kind: 'update',
      programId: program.id,
      data: {
        name: snapshot.programName,
        // Merge onto the existing config so keys we don't manage survive.
        config: { ...program.config, ...config } as ProgramConfig,
        reward_name: rewardName,
      },
    };
  }

  // 4. Type change with too many customers to convert safely — blocked.
  if (customerCount > MAX_SWITCH_CUSTOMERS) {
    return { kind: 'blocked', customerCount };
  }

  // 5. Type change: flip the program in place and convert the existing test
  //    cards (reusing them — no deletion). Confirm first when any card is out.
  return {
    kind: 'convert',
    needsConfirm: customerCount > 0,
    customerCount,
    data: { toType: targetType, config, rewardName },
  };
}
