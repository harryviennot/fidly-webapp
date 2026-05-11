export type BillingStatus = "trial" | "active" | "past_due" | "cancelled" | "grace" | "suspended";

export interface Business {
  id: string;
  name: string;
  url_slug: string;
  subscription_tier: "starter" | "growth" | "pro";
  status: "pending" | "active" | "suspended";
  activated_at?: string | null;
  is_founding_partner?: boolean;
  billing_status?: BillingStatus;
  trial_ends_at?: string | null;
  billing_period_end?: string | null;
  settings: BusinessSettings;
  logo_url?: string | null;
  icon_url?: string | null;
  icon_original_url?: string | null;
  primary_locale: "fr" | "en";
  created_at?: string;
  updated_at?: string;
}

export type FieldCollectionMode = "off" | "required" | "optional";

export interface CustomerDataCollection {
  collect_name?: FieldCollectionMode | boolean;
  collect_email?: FieldCollectionMode | boolean;
  collect_phone?: FieldCollectionMode | boolean;
}

export interface NotificationTemplate {
  title: string;
  message: string;
}

export interface NotificationTemplates {
  stamp?: NotificationTemplate;
  milestone?: NotificationTemplate;
  reward?: NotificationTemplate;
}

export interface BusinessInfoEntry {
  type: "hours" | "website" | "phone" | "email" | "address" | "custom";
  key: string;
  data: Record<string, unknown>;
}

export interface SetupStepRef {
  chapter: string;
  step?: string;
}

export interface SetupProgress {
  started_at: string;
  completed_at: string | null;
  last_step: SetupStepRef;
  completed: SetupStepRef[];
  skipped: SetupStepRef[];
  payload: {
    design_id?: string;
    demo_customer_id?: string;
    demo_enrollment_id?: string;
  };
}

export interface BusinessSettings {
  accentColor?: string;
  backgroundColor?: string;
  category?: string;
  owner_name?: string;
  customer_data_collection?: CustomerDataCollection;
  notification_templates?: NotificationTemplates;
  onboarding_complete?: boolean;
  setup_checklist_dismissed?: boolean;
  business_info?: BusinessInfoEntry[];
  setup_progress?: SetupProgress;
  first_broadcast_sent?: boolean;
  design_reviewed?: boolean;
  business_type?: string;
  team_size?: string;
  locations_count?: string;
  primary_goal?: string;
  [key: string]: unknown;
}

export interface BusinessUpdate {
  name?: string;
  settings?: BusinessSettings;
  logo_url?: string | null;
  primary_locale?: "fr" | "en";
}
