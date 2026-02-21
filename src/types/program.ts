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
}

export type LoyaltyProgramUpdate = Partial<Pick<LoyaltyProgram,
  'name' | 'config' | 'reward_name' | 'reward_description' | 'back_fields' | 'translations'
>>;
