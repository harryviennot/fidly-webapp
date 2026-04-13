export type TriggerType =
  | 'stamp_added'
  | 'reward_earned'
  | 'reward_redeemed'
  | 'milestone'
  | 'near_reward';

export type Locale = 'en' | 'fr';

export type LocalizedBody = Record<Locale, string>;

export interface NotificationTemplate {
  template_id: string | null;
  trigger: TriggerType;
  body: LocalizedBody;
  is_enabled: boolean;
  is_editable: boolean;
  is_customized: boolean;
  trigger_config?: {
    stamp_equals?: number;
    stamps_before_reward?: number;
  };
}

/** Envelope returned by GET /notifications/{business_id}/templates */
export interface NotificationTemplatesResponse {
  program_id: string;
  tier: 'starter' | 'growth' | 'pro';
  items: NotificationTemplate[];
}

export type BroadcastStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'cancelled'
  | 'failed';

export interface BroadcastTargetFilter {
  all?: boolean;
  enrolled_before_days?: number;
  enrolled_after_days?: number;
  stamp_count_min?: number;
  stamp_count_max?: number;
  has_redeemed?: boolean;
  inactive_days?: number;
}

export interface BroadcastTranslations {
  en?: { title: string; body: string };
  fr?: { title: string; body: string };
}

export interface Broadcast {
  id: string;
  business_id: string;
  title: string;
  body: string;
  translations: BroadcastTranslations;
  target_filter: BroadcastTargetFilter;
  status: BroadcastStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  created_by: string;
  created_at: string;
  total_recipients: number | null;
  delivered: number;
  failed: number;
  google_throttled: number;
}

export interface BroadcastListParams {
  status?: BroadcastStatus | 'all';
  cursor?: string;
  limit?: number;
}

export interface PaginatedBroadcasts {
  items: Broadcast[];
  next_cursor: string | null;
  total_this_month: number;
}

export interface BroadcastCreate {
  title: string;
  body: string;
  translations?: BroadcastTranslations;
  target_filter: BroadcastTargetFilter;
  status?: 'draft' | 'scheduled' | 'sending';
  scheduled_at?: string | null;
}

export interface BroadcastUpdate {
  title?: string;
  body?: string;
  translations?: BroadcastTranslations;
  target_filter?: BroadcastTargetFilter;
  scheduled_at?: string | null;
}

export interface RecipientEstimate {
  count: number;
}

export interface BusinessIconUploadResponse {
  url: string;
}
