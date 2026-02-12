export interface CustomerResponse {
  id: string;
  name: string;
  email: string;
  stamps: number;
  total_redemptions?: number;
  created_at?: string;
  updated_at?: string;
}
