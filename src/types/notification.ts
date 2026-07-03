export type TriggerType =
  | 'stamp_added'
  | 'points_earned'
  | 'reward_earned'
  // Multi-reward points only: fires instead of reward_earned when the customer
  // wins the top rung (no "next reward" left). Backend auto-routes between the
  // two; the editor only lists this for multi-reward programs.
  | 'reward_completed'
  | 'reward_redeemed'
  | 'milestone'
  | 'near_reward';

export type Locale = 'en' | 'fr' | 'es';

export type LocalizedBody = Record<Locale, string>;

export interface NotificationTemplate {
  template_id: string | null;
  trigger: TriggerType;
  body: LocalizedBody;
  /** Python default body from the backend — used for "reset to default". */
  default_body: LocalizedBody;
  is_enabled: boolean;
  is_editable: boolean;
  is_customized: boolean;
  /** True when the business is on Starter and the backend returns default
   *  content instead of the stored custom body. */
  is_using_default?: boolean;
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

/** What a milestone threshold is measured against. `balance` = the customer's
 *  current stamp/points balance; `lifetime` = their all-time earned total. */
export type MilestoneMetric = 'balance' | 'lifetime';

/** A milestone fires when a customer reaches a threshold. Legacy stamp
 *  milestones carry `stamp_equals` (a current-balance stamp count); new ones
 *  carry `value` + `metric` and work for both stamp and points programs. */
export interface Milestone {
  id: string;
  /** Legacy stamp-count trigger. Null on new value+metric milestones. */
  stamp_equals: number | null;
  /** New unified threshold (stamps or points, depending on the program). */
  value?: number | null;
  metric?: MilestoneMetric | null;
  body: LocalizedBody;
  is_enabled: boolean;
}

/** The milestone's threshold, preferring the new `value` over legacy `stamp_equals`. */
export function milestoneValue(m: Pick<Milestone, 'value' | 'stamp_equals'>): number {
  return m.value ?? m.stamp_equals ?? 0;
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
  value: number;
  metric: MilestoneMetric;
  body: LocalizedBody;
  is_enabled?: boolean;
}

/** Partial update — any field is optional but at least one is required by the backend. */
export interface MilestoneUpdate {
  value?: number;
  metric?: MilestoneMetric;
  body?: LocalizedBody;
  is_enabled?: boolean;
}

/**
 * PUT /milestones/{id} response. Extends Milestone with an optional
 * `swapped_off` field: when the user toggles a milestone ON while at the
 * tier's cap, the backend auto-disables the oldest currently-active
 * milestone and returns it here so the frontend can show a toast.
 */
export interface MilestoneUpdateResponse extends Milestone {
  swapped_off?: Milestone;
}

export type BroadcastStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'cancelled'
  | 'failed';

export interface EnrolledLocationFilter {
  ids: string[];
  include_no_location?: boolean;
}

export interface ActiveLocationFilter {
  ids: string[];
  days: number;
}

export interface BroadcastTargetFilter {
  all?: boolean;
  enrolled_before_days?: number;
  enrolled_after_days?: number;
  /** Progress-range bounds: stamp count for stamp programs, points balance
   *  for points programs. Canonical keys; rows written before the scans
   *  rename carry `stamp_count_min/max` instead (see normalizeTargetFilter). */
  value_min?: number;
  value_max?: number;
  /** @deprecated Legacy key on pre-rename rows. Read via normalizeTargetFilter. */
  stamp_count_min?: number;
  /** @deprecated Legacy key on pre-rename rows. Read via normalizeTargetFilter. */
  stamp_count_max?: number;
  /** Customer currently holds a redeemable reward: banked rewards or a full
   *  card (stamps), or a balance covering at least one reward (points). */
  has_unredeemed_reward?: boolean;
  has_redeemed?: boolean;
  inactive_days?: number;
  enrolled_at_location_ids?: EnrolledLocationFilter;
  active_at_location_ids?: ActiveLocationFilter;
}

export interface BroadcastTranslations {
  en?: { title: string; body: string };
  fr?: { title: string; body: string };
  es?: { title: string; body: string };
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
  /**
   * Customers with at least one active push channel at send time. Denominator
   * for the delivery-rate percentage shown in the UI. `total_recipients -
   * reachable_recipients == skipped_no_push`.
   */
  reachable_recipients: number;
  delivered: number;
  failed: number;
  /** Google 3/24h quota exceeded — message dropped for this send. */
  google_throttled: number;
  /** Apple silent push accepted by APNs. */
  apple_delivered: number;
  /** Apple push rejected by APNs (includes permanent failures). */
  apple_failed: number;
  /** Google `addMessage` returned `sent`. */
  google_delivered: number;
  /** Google `addMessage` returned a non-404, non-429 error. */
  google_failed: number;
  /**
   * Google `addMessage` returned 404 — the pass was removed from the
   * customer's Google Wallet. Distinct from `google_failed`.
   */
  google_not_installed: number;
  /**
   * Segment matches with no active push channel. These are customers who
   * never installed the pass or whose Apple token was soft-disabled after
   * a permanent APNs failure.
   */
  skipped_no_push: number;
  /** IANA timezone selected when scheduling (e.g. "Europe/Paris"). Display only. */
  timezone: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export type BroadcastStatusFilter = 'scheduled' | 'sent' | 'drafts';

export interface BroadcastListParams {
  limit?: number;
  offset?: number;
  status?: BroadcastStatusFilter;
}

export interface BroadcastStatsResponse {
  month_quota_used: number;
  last_sent: Broadcast | null;
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
  /** IANA timezone for display purposes (e.g. "Europe/Paris"). */
  timezone?: string;
}

export interface BroadcastUpdate {
  title?: string;
  body?: string;
  translations?: BroadcastTranslations;
  target_filter?: BroadcastTargetFilter;
  scheduled_at?: string | null;
}

export interface BroadcastSendAgain {
  /** ISO datetime. Omit or pass null to send immediately. Pro only when set. */
  scheduled_at?: string | null;
  /** IANA timezone for display purposes (e.g. "Europe/Paris"). */
  timezone?: string;
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
