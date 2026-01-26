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
  created_at?: string;
  updated_at?: string;
}

export interface StampResponse {
  customer_id: string;
  name: string;
  stamps: number;
  message: string;
}
