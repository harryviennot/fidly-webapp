export interface Business {
  id: string;
  name: string;
  url_slug: string;
  subscription_tier: "pay" | "pro";
  settings: BusinessSettings;
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerDataCollection {
  collect_name?: boolean;
  collect_email?: boolean;
  collect_phone?: boolean;
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

export interface BusinessSettings {
  accentColor?: string;
  backgroundColor?: string;
  category?: string;
  owner_name?: string;
  customer_data_collection?: CustomerDataCollection;
  notification_templates?: NotificationTemplates;
  onboarding_complete?: boolean;
  [key: string]: unknown;
}

export interface BusinessUpdate {
  name?: string;
  settings?: BusinessSettings;
  logo_url?: string | null;
}
