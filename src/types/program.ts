import type { PassField } from './design';

export type LoyaltyType = 'stamp' | 'points';

export interface LoyaltyProgram {
  id: string;
  business_id: string;
  name: string;
  type: LoyaltyType;
  is_active: boolean;
  is_default: boolean;
  config: ProgramConfig;
  reward_name: string | null;
  reward_description: string | null;
  back_fields: PassField[];
  translations: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StampProgramConfig {
  total_stamps: number;
  auto_reset_on_redeem?: boolean;
  user_configured?: boolean;
  /** Prestamp: new customers start with this many stamps (0..total-1). */
  initial_stamps?: number;
  /** Stackable rewards: full card banks a reward and stamping continues. */
  stackable_rewards?: boolean;
  /** Max banked rewards; null/undefined = unlimited. */
  max_stacked_rewards?: number | null;
}

/**
 * A reward in the shared ladder. For stamp programs `threshold` is a stamp
 * count; for points programs it is the reward's price in points. `id` is stable
 * within a program (the points card designer keys reward icons off it).
 */
export interface RewardTier {
  id: string;
  threshold: number;
  name: string;
}

export interface PointsProgramConfig {
  /** Points earned per 1 unit of the business currency spent (default 1). */
  points_per_currency_unit: number;
  /** Optional balance cap; null/undefined = no cap. Accrual stops at it. */
  max_balance?: number | null;
  /** Priced reward menu. Always at least one entry. */
  rewards: RewardTier[];
  /** Backend-added; points are always spend-down ('stack'). */
  redemption_policy?: 'stack' | 'reset';
  user_configured?: boolean;
}

export type ProgramConfig = StampProgramConfig | PointsProgramConfig;

export function isPointsProgram(
  program: LoyaltyProgram | null | undefined
): program is LoyaltyProgram & { config: PointsProgramConfig } {
  return program != null && program.type === 'points';
}

export function isStampProgram(
  program: LoyaltyProgram | null | undefined
): program is LoyaltyProgram & { config: StampProgramConfig } {
  // Any existing non-points program is treated as a stamp program. Returns
  // false for a null/undefined program so callers can safely read `.config`.
  return program != null && program.type !== 'points';
}

export type LoyaltyProgramUpdate = Partial<Pick<LoyaltyProgram,
  'name' | 'config' | 'reward_name' | 'reward_description' | 'back_fields' | 'translations'
>> & {
  /** Raise-goal instruction for customers already at the old goal (stamp only). */
  existing_customers_strategy?: 'grant_reward' | 'keep_stamps';
};

/**
 * POST /programs/{businessId} body. When the business has no customers (the
 * onboarding case) the backend deletes the existing default program and
 * recreates it with this type — the only way to switch a program's type.
 */
export interface ProgramCreate {
  name: string;
  type: LoyaltyType;
  is_active?: boolean;
  is_default?: boolean;
  config: ProgramConfig;
  reward_name?: string | null;
  reward_description?: string | null;
}

/** One rung of the reward ladder in a {@link ProgramSnapshot}. */
export interface ProgramSnapshotReward {
  id: string;
  threshold: number;
  name: string;
  reached: boolean;
}

/**
 * The backend's type-aware view of an enrollment (mirrors
 * BaseEngine.describe_progress). Embedded as `customer.program` on the customer
 * DETAIL endpoint. `display` is pre-formatted ("7 / 10" | "130 pts").
 */
export interface ProgramSnapshot {
  type: LoyaltyType;
  primary_value: number;
  display: string;
  reward_ready: boolean;
  is_complete: boolean;
  next_threshold: number | null;
  threshold_after: number | null;
  /** points: config.max_balance; null when no cap / for stamps. */
  max_limit: number | null;
  /** points: lifetime_points; null for stamps. */
  lifetime: number | null;
  /** stamps: banked rewards; 0 for points. */
  rewards_banked: number;
  rewards: ProgramSnapshotReward[];
  /** points only: lets the redeem/keypad UI preview "= +N points". */
  points_per_currency_unit: number | null;
}

/** GET /programs/{biz}/{id}/stamp-goal-impact response. */
export interface StampGoalImpact {
  direction: 'raise' | 'lower' | 'none';
  affected_count: number;
  banked_rewards_count: number;
  old_total: number;
  new_total: number;
  stackable_rewards: boolean;
}
