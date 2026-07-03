export type TransactionType =
  | 'stamp_added'
  | 'points_earned'
  | 'reward_redeemed'
  | 'stamp_voided'
  | 'points_voided'
  | 'bonus_stamp'
  | 'bonus_points'
  | 'stamps_adjusted'
  | 'points_adjusted'
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
  /**
   * Type-neutral value columns (backend migration 121). `delta` is the signed
   * change; `value_before`/`value_after` are the primary value (stamps OR points
   * balance) around the event. `program_type` snapshots the unit.
   */
  delta: number;
  value_before: number;
  value_after: number;
  program_type?: 'stamp' | 'points' | null;
  /** Ticket price behind a points scan, in the business currency (null for stamps). */
  amount?: number | null;
  /**
   * Legacy stamp-named columns, dual-written during the migration window.
   * Prefer `delta`/`value_before`/`value_after`; these are kept for back-compat.
   */
  stamp_delta?: number;
  stamps_before?: number;
  stamps_after?: number;
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
  /** "Typical day" baseline: avg per-active-day stamps+rewards over the last 30d. */
  avg_daily_activity: number;
  /** Previous week up to the same elapsed point as now (honest week-to-date WoW). */
  total_prev_week_to_date: number;
  /** Busiest single day on record (same event set as the Today card) + its date. */
  best_day_count: number;
  best_day_date: string | null;
}

/**
 * Program-effectiveness metrics for the /program control center (migration 115).
 * Scoped to the business's default program. Rates are 0..1 fractions.
 */
export interface ProgramHealthResponse {
  total_enrollments: number;
  /** Reached the goal: redeemed once, holding a banked reward, or status='completed'. */
  completed_count: number;
  completion_rate: number;
  total_rewards_redeemed: number;
  redemption_rate: number;
  avg_stamps_per_customer: number;
  /** null (not 0) when nobody has redeemed yet — render an em-dash. */
  avg_days_to_first_reward: number | null;
  install_rate: number;
  active_cards: number;
  banked_rewards_count: number;
  /** Program type (migration 125) — relabels the stamp-named columns above for
   *  points programs (e.g. avg_stamps_per_customer is an avg BALANCE). */
  program_type?: 'stamp' | 'points' | null;
  /** Points programs: SUM of ticket prices (transactions.amount). 0 for stamps. */
  total_spend?: number | null;
  /** Points programs: AVG ticket price. null for stamps. */
  avg_ticket?: number | null;
}

/** One complete week of scan volume, used to derive the weekly-goal baseline. */
export interface WeeklyScanPoint {
  week_start: string;
  scans: number;
}

/** One recorded trophy in the business_achievements ledger (migration 96).
 *  `acknowledged_at` is null until the unlock has been celebrated once. */
export interface UnlockedAchievement {
  key: string;
  unlocked_at: string;
  acknowledged_at: string | null;
}

/**
 * Lifetime "trophy" counters + a trailing weekly scan series powering the
 * dashboard Achievements + weekly-goal widget and the /achievements page.
 * Definitions mirror the dashboard StatCards exactly (a scan = stamp_added or
 * points_earned, so both program types count; repeat = >=2 distinct scan-days;
 * repeat_rate is a 0..1 fraction). See web/docs/dashboard-achievements.md.
 */
export interface BusinessAchievementsResponse {
  total_customers: number;
  total_scans: number;
  total_rewards_redeemed: number;
  repeat_customers: number;
  /** customers with >=2 distinct scan-days / customers who ever scanned (0..1) */
  repeat_rate: number;
  active_cards: number;
  first_reward_redeemed_at: string | null;
  current_week_scans: number;
  /** Rolling 30-day windows (now - 30d). Reward sustained effort. */
  scans_last_30d: number;
  new_customers_last_30d: number;
  /** Prior 30-day window [now-60d, now-30d) — powers the customer-page growth badge. */
  new_customers_prev_30d: number;
  /** Customers with >=2 distinct scan-days OR >=1 redemption in the last 6 months
   *  ("currently loyal" dashboard KPI), distinct from the lifetime
   *  `repeat_customers` trophy metric. */
  loyal_customers_6m: number;
  /** Last 5 complete weeks, oldest -> newest. Excludes the current partial week. */
  weekly_scan_series: WeeklyScanPoint[];
  /** App-adoption trophies (per-membership platforms_used): the owner has scanned
   *  from the native app; every active scanner uses the native app, not the browser. */
  owner_used_native_app: boolean;
  all_employees_use_native_app: boolean;
  /** Per-trophy unlock ledger: when each was earned + whether it's been celebrated. */
  unlocked: UnlockedAchievement[];
  /** Whether the business has been seeded (the '__init__' sentinel exists). Gates
   *  first-contact silent seeding so established shops don't replay their history. */
  initialized: boolean;
}

/** Ledger returned by the sync / acknowledge writes. */
export interface AchievementLedgerResponse {
  unlocked: UnlockedAchievement[];
  initialized: boolean;
}

export interface StampResponse {
  customer_id: string;
  name: string;
  /** Legacy primary value (same as value_after). */
  stamps: number;
  /** Unambiguous primary value after the action (stamps OR points balance). */
  value_after?: number | null;
  program_type?: 'stamp' | 'points' | null;
  /** Banked rewards (stackable stamp programs). */
  rewards?: number;
  message: string;
  transaction_id?: string;
  location_id?: string | null;
  location_name?: string | null;
}
