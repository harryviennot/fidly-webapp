export interface PassField {
  key: string;
  label: string;
  value: string;
}

export interface DesignTranslation {
  organization_name?: string;
  description?: string;
  logo_text?: string;
  secondary_fields?: PassField[];
  auxiliary_fields?: PassField[];
  back_fields?: PassField[];
}

/**
 * A merchant-uploaded icon with its server-derived variants. Produced once
 * by the backend at upload time; the preview renders these URLs verbatim,
 * which is what guarantees preview/strip parity. Assets are immutable per
 * id (a re-upload mints a new id).
 */
export interface ProcessedIconAsset {
  id: string;
  original_url: string;
  processed_url: string;
  greyscale_url: string;
  outline_url: string;
  bg_removed: boolean;
}

export type CustomStampEmptyMode = "greyscale" | "outline" | "custom";
export type CustomStampArrangement = "straight" | "staggered" | "overlap";

/**
 * Custom stamp icon configuration (mirrors backend CustomStampConfig).
 * `icons` is the ordered rotation list: stamp slot i renders icons[i % n];
 * the last slot uses reward_icon when set.
 */
export interface CustomStampConfig {
  icons: ProcessedIconAsset[];
  reward_icon?: ProcessedIconAsset | null;
  empty_icon?: ProcessedIconAsset | null;
  empty_mode: CustomStampEmptyMode;
  arrangement: CustomStampArrangement;
}

export type StampIconMode = "preset" | "custom";

export interface CardDesign {
  id: string;
  name: string;
  is_active: boolean;

  // Text
  organization_name: string;
  description: string;
  logo_text?: string;

  // Colors
  foreground_color: string;
  background_color: string;
  label_color: string;

  // Stamp config
  total_stamps: number;
  stamp_filled_color: string;
  stamp_empty_color: string;
  stamp_border_color: string;
  stamp_icon?: string;
  reward_icon?: string;
  icon_color?: string;

  // Custom stamp icons (STA-216)
  card_type?: string;
  stamp_icon_mode?: StampIconMode;
  custom_stamp_config?: CustomStampConfig | null;

  // Asset URLs
  logo_url?: string;
  custom_filled_stamp_url?: string;
  custom_empty_stamp_url?: string;
  strip_background_url?: string;
  strip_background_opacity?: number;

  // Pass fields
  secondary_fields: PassField[];
  auxiliary_fields: PassField[];
  back_fields: PassField[];

  // Business info visibility
  hidden_business_info_keys?: string[];

  // Translations
  translations?: Record<string, DesignTranslation>;

  // Strip image generation status. `regenerating` while the backend is
  // rebuilding strip PNGs after a stamp/color/icon change; `ready` once
  // they're cached and a fresh pkpass can be served.
  strip_status?: 'ready' | 'regenerating';

  created_at?: string;
  updated_at?: string;

  // Downgrade handling
  is_over_limit?: boolean;
}

export interface CardDesignCreate {
  name: string;
  organization_name: string;
  description: string;
  logo_text?: string;

  foreground_color?: string;
  background_color?: string;
  label_color?: string;

  stamp_filled_color?: string;
  stamp_empty_color?: string;
  stamp_border_color?: string;
  stamp_icon?: string;
  reward_icon?: string;
  icon_color?: string;
  stamp_icon_mode?: StampIconMode;
  custom_stamp_config?: CustomStampConfig | null;
  strip_background_opacity?: number;

  logo_url?: string;
  strip_background_url?: string;

  secondary_fields?: PassField[];
  auxiliary_fields?: PassField[];
  back_fields?: PassField[];

  hidden_business_info_keys?: string[];

  translations?: Record<string, DesignTranslation>;
}

export type CardDesignUpdate = Partial<CardDesignCreate>;

export interface UploadResponse {
  id: string;
  asset_type: string;
  url: string;
  filename: string;
}
