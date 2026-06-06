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
  // Nullable: businesses that don't collect email leave this empty (no
  // placeholder). Guard every read with `?? ""` / a presence check.
  email?: string | null;
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
  // Multi-location: the location the customer signed up through. NULL is a
  // first-class state — parent-org enrollment via /{biz_slug} with no
  // location suffix. Display as "Direct signup", not as missing data.
  enrolled_at_location_id?: string | null;
  enrolled_at_location_name?: string | null;
  // Server-computed lifecycle segment (backend migration 102 search_customers).
  // Only the list endpoint populates this; other producers leave it undefined.
  // Mirrors CustomerSegment in @/lib/customer-segments — kept inline to avoid a
  // type import cycle (customer-segments imports CustomerResponse from here).
  segment?: "new" | "regular" | "vip" | "close_to_reward" | "at_risk" | "ghost" | null;
}

export interface PaginatedCustomerResponse {
  data: CustomerResponse[];
  total: number;
  limit: number;
  offset: number;
}
