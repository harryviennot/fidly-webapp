import type { PassField } from './design';

export interface LoyaltyProgram {
  id: string;
  business_id: string;
  name: string;
  type: 'stamp';
  is_active: boolean;
  is_default: boolean;
  config: StampProgramConfig;
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

export type LoyaltyProgramUpdate = Partial<Pick<LoyaltyProgram,
  'name' | 'config' | 'reward_name' | 'reward_description' | 'back_fields' | 'translations'
>> & {
  /** Raise-goal instruction for customers already at the old goal. */
  existing_customers_strategy?: 'grant_reward' | 'keep_stamps';
};

/** GET /programs/{biz}/{id}/stamp-goal-impact response. */
export interface StampGoalImpact {
  direction: 'raise' | 'lower' | 'none';
  affected_count: number;
  banked_rewards_count: number;
  old_total: number;
  new_total: number;
  stackable_rewards: boolean;
}
