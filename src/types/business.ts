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

export interface BusinessSettings {
  accentColor?: string;
  backgroundColor?: string;
  category?: string;
  owner_name?: string;
  [key: string]: unknown;
}

export interface BusinessUpdate {
  name?: string;
  settings?: BusinessSettings;
  logo_url?: string | null;
}
