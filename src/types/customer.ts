export interface CustomerResponse {
  id: string;
  name: string;
  email: string;
  stamps: number;
  total_redemptions?: number;
  last_activity_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedCustomerResponse {
  data: CustomerResponse[];
  total: number;
  limit: number;
  offset: number;
}
