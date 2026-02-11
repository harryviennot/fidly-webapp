export type TransactionType =
  | 'stamp_added'
  | 'reward_redeemed'
  | 'stamp_voided'
  | 'bonus_stamp'
  | 'stamps_adjusted';

export type TransactionSource = 'scanner' | 'dashboard' | 'api' | 'system';

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
}

export interface StampResponse {
  customer_id: string;
  name: string;
  stamps: number;
  message: string;
  transaction_id?: string;
}
