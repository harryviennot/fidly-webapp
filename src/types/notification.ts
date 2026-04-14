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

/** Stamp-count milestone — fires when customer reaches a specific stamp count. */
export interface Milestone {
  id: string;
  stamp_equals: number;
  body: LocalizedBody;
  is_enabled: boolean;
}

/** Envelope returned by GET /notifications/{business_id}/milestones */
export interface MilestonesResponse {
  program_id: string;
  tier: 'starter' | 'growth' | 'pro';
  /** Max milestones per program. 0 = Starter (no milestones), null = Pro (unlimited). */
  limit: number | null;
  items: Milestone[];
}

export interface MilestoneCreate {
  stamp_equals: number;
  body: LocalizedBody;
  is_enabled?: boolean;
}

/** Partial update — any field is optional but at least one is required by the backend. */
export interface MilestoneUpdate {
  stamp_equals?: number;
  body?: LocalizedBody;
  is_enabled?: boolean;
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

/**
 * Broadcast row as returned by `_serialize_broadcast` in the backend.
 * `title` and `body` are the primary-locale content; other locales live in
 * `translations[locale] = { title, body }`.
 */
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
  total_recipients: number;
  delivered: number;
  failed: number;
  google_throttled: number;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface BroadcastListParams {
  limit?: number;
  offset?: number;
}

/** Offset-paginated envelope — mirrors GET /broadcasts/{business_id}. */
export interface PaginatedBroadcasts {
  items: Broadcast[];
  total: number;
  limit: number;
  offset: number;
}

export interface BroadcastCreate {
  title: string;
  body: string;
  translations?: BroadcastTranslations;
  target_filter?: BroadcastTargetFilter;
  /** ISO datetime. Mutually exclusive with `immediate: true`. Pro only. */
  scheduled_at?: string | null;
  /** When true, backend flips status to 'sending' + enqueues the worker. */
  immediate?: boolean;
}

export interface BroadcastUpdate {
  title?: string;
  body?: string;
  translations?: BroadcastTranslations;
  target_filter?: BroadcastTargetFilter;
  scheduled_at?: string | null;
}

export interface RecipientEstimateResponse {
  target_filter: BroadcastTargetFilter;
  total: number;
}

export interface RecipientEstimate {
  count: number;
}

export interface BusinessIconUploadResponse {
  url: string;
}
