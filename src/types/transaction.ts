export type TransactionType =
  | 'stamp_added'
  | 'reward_redeemed'
  | 'stamp_voided'
  | 'bonus_stamp'
  | 'stamps_adjusted'
  | 'card_added'
  | 'card_re_added'
  | 'card_deleted';

export type TransactionSource = 'scanner' | 'dashboard' | 'api' | 'system' | 'wallet';

export interface TransactionResponse {
  id: string;
  business_id: string;
  customer_id: string;
  employee_id: string | null;
  employee_name: string | null;
  type: TransactionType;
  stamp_delta: number;
  stamps_before: number;
  stamps_after: number;
  metadata: Record<string, unknown> | null;
  source: TransactionSource;
  voided_transaction_id: string | null;
  created_at: string;
  location_id: string | null;
  location_name: string | null;
}

export interface TransactionListResponse {
  transactions: TransactionResponse[];
  total_count: number;
  has_more: boolean;
}

export interface ActivityStatsResponse {
  stamps_today: number;
  rewards_today: number;
  total_this_week: number;
  active_customers_today: number;
  latest_transaction_at: string | null;
  /** Customers who currently hold a pass (net installed, Apple + Google). */
  active_cards: number;
  stamps_this_week: number;
  rewards_this_week: number;
  /** Previous-week baselines for week-over-week trend arrows. */
  stamps_prev_week: number;
  rewards_prev_week: number;
  new_customers_this_week: number;
  new_customers_prev_week: number;
}

/** One complete week of stamp volume, used to derive the weekly-goal baseline. */
export interface WeeklyStampPoint {
  week_start: string;
  stamps: number;
}

/**
 * Lifetime "trophy" counters + a trailing weekly stamp series powering the
 * dashboard Achievements + weekly-goal widget and the /achievements page.
 * Definitions mirror the dashboard StatCards exactly (stamps = stamp_added only;
 * repeat = >=2 distinct stamp-days; repeat_rate is a 0..1 fraction).
 * See web/docs/dashboard-achievements.md.
 */
export interface BusinessAchievementsResponse {
  total_customers: number;
  total_stamps_given: number;
  total_rewards_redeemed: number;
  repeat_customers: number;
  /** customers with >=2 distinct stamp-days / customers who ever stamped (0..1) */
  repeat_rate: number;
  active_cards: number;
  first_reward_redeemed_at: string | null;
  current_week_stamps: number;
  /** Rolling 30-day windows (now - 30d). Reward sustained effort. */
  stamps_last_30d: number;
  new_customers_last_30d: number;
  /** Last 5 complete weeks, oldest -> newest. Excludes the current partial week. */
  weekly_stamp_series: WeeklyStampPoint[];
}

export interface StampResponse {
  customer_id: string;
  name: string;
  stamps: number;
  message: string;
  transaction_id?: string;
}
