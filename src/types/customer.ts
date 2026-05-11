export interface Enrollment {
  id: string;
  program_id: string;
  progress: { stamps?: number; points?: number; [key: string]: unknown };
  status: string;
  total_redemptions?: number;
  last_activity_at?: string;
}

export interface CustomerResponse {
  id: string;
  name: string;
  email: string;
  // Flat convenience fields — sourced from enrollments[0]. Customer list,
  // segment classifier, stats cards keep reading these.
  stamps: number;
  total_redemptions?: number;
  last_activity_at?: string;
  created_at?: string;
  updated_at?: string;
  // Source-of-truth list of this customer's enrollments at this business.
  // Always length 1 today; multi-program future will produce length N.
  enrollments: Enrollment[];
}

export interface PaginatedCustomerResponse {
  data: CustomerResponse[];
  total: number;
  limit: number;
  offset: number;
}
