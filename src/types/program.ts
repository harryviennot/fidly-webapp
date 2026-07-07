import type { PassField } from './design';
import type {
  ConversionPolicy,
  PointsToStampsPolicy,
  StampsToPointsPolicy,
} from '@/lib/conversion';

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
 * POST /programs/{businessId} body. A 0-customer lazy-init stub is replaced
 * cleanly; once customers exist, type changes go through the in-place
 * onboarding switch (POST /programs/{id}/switch-type) or the conversion wizard.
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

// ── Program type conversion (stamp <-> points) ──

export type { ConversionPolicy, PointsToStampsPolicy, StampsToPointsPolicy };

/** One row of program_conversions — the executed-conversion record powering
 * the wizard's live progress (realtime on pushed_count/status), the activity
 * page's conversion marker, and the broadcasts pause nudge. */
export interface ProgramConversion {
  id: string;
  business_id: string;
  program_id: string;
  from_type: LoyaltyType;
  to_type: LoyaltyType;
  rate: number;
  policy: ConversionPolicy;
  total_enrollments: number;
  converted_count: number;
  skipped_count: number;
  banked_rewards_honored: number;
  paused_broadcast_ids: string[];
  disabled_milestone_count: number;
  announce: { enabled?: boolean; messages?: Record<string, string> };
  status: 'pushing' | 'completed' | 'failed';
  pushed_count: number;
  created_at: string;
  completed_at: string | null;
}

/** POST /programs/{biz}/{id}/convert/preview body. */
export interface ConversionPreviewRequest {
  to_type: LoyaltyType;
  rate: number;
  policy: ConversionPolicy;
  config: Record<string, unknown>;
  reward_name?: string | null;
}

export interface ConversionSampleRow {
  enrollment_id: string;
  customer_name: string;
  value_before: number;
  value_after: number;
  /** Banked (earned, unredeemed) rewards held BEFORE the conversion — their
   * grant hides inside value_after, so the table shows them explicitly. */
  banked_before: number;
  banked_after: number;
  /** True when the owner's max_balance cut this customer's converted total. */
  clamped: boolean;
  discarded: boolean;
}

/** POST /programs/{biz}/{id}/convert/preview response. */
export interface ConversionPreview {
  total_enrollments: number;
  affected_count: number;
  banked_holders: number;
  losers_count: number;
  clamped_count: number;
  banked_rewards_honored: number;
  sample: ConversionSampleRow[];
  suggested_rate: number;
  affected_broadcasts: { id: string; title: string | null; scheduled_at: string | null }[];
  milestone_count: number;
  last_conversion_at: string | null;
}

/** Staged notification copy applied server-side AFTER the type flip (a
 * pre-flip PUT would be rejected as cross-type). */
export interface ConversionNotificationsPayload {
  templates?: { trigger: string; body?: Record<string, string>; is_enabled?: boolean }[];
  milestones?: { value: number; metric?: 'balance' | 'lifetime'; body?: Record<string, string> }[];
}

/** POST /programs/{biz}/{id}/convert body. */
export interface ConvertRequest {
  to_type: LoyaltyType;
  rate: number;
  policy: ConversionPolicy;
  design_id: string;
  config: Record<string, unknown>;
  reward_name?: string | null;
  reward_description?: string | null;
  back_fields?: Record<string, unknown>[] | null;
  translations?: Record<string, unknown> | null;
  notifications?: ConversionNotificationsPayload | null;
  announce?: { enabled: boolean; messages: Record<string, string> } | null;
}

/** POST /programs/{biz}/{id}/convert response. */
export interface ConvertResult {
  conversion_id: string;
  total_enrollments: number;
  converted: number;
  skipped_final: string[];
  paused_broadcast_ids: string[];
  disabled_milestones: number;
  warnings: string[];
}
