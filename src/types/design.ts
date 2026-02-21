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

  // Translations
  translations?: Record<string, DesignTranslation>;

  created_at?: string;
  updated_at?: string;
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
  strip_background_opacity?: number;

  logo_url?: string;
  strip_background_url?: string;

  secondary_fields?: PassField[];
  auxiliary_fields?: PassField[];
  back_fields?: PassField[];

  translations?: Record<string, DesignTranslation>;
}

export type CardDesignUpdate = Partial<CardDesignCreate>;

export interface UploadResponse {
  id: string;
  asset_type: string;
  url: string;
  filename: string;
}
