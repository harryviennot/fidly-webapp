export interface CustomerCreate {
  name: string;
  email: string;
}

export interface CustomerResponse {
  id: string;
  name: string;
  email: string;
  stamps: number;
  pass_url: string;
  total_redemptions?: number;
  created_at?: string;
  updated_at?: string;
}
