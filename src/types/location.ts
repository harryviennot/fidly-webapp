/**
 * Multi-location feature types. Mirrors the backend schemas documented
 * in backend/docs/locations/ROUTES.md.
 */

export interface AddressComponents {
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  country_code?: string;
  formatted?: string;
}

export interface LocalizedWalletMessage {
  en?: string;
  fr?: string;
}

export interface Location {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  is_primary: boolean;
  address: string;
  address_components: AddressComponents | null;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  wallet_message: LocalizedWalletMessage | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface LocationCreate {
  name: string;
  slug?: string;
  address?: string;
  address_components?: AddressComponents;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number;
  is_primary?: boolean;
  wallet_message?: LocalizedWalletMessage | null;
  /** When true AND this is the business's first active location, the backend
   *  retroactively tags all NULL-location transactions and customers to this
   *  new location. Silently ignored on 2nd+ creates. */
  backfill_legacy?: boolean;
}

/** Summary of a backfill pass returned by POST /locations/{businessId}.
 *  `backfilled` is true only when `backfill_legacy=true` was honoured (i.e.
 *  this was the first active location). Otherwise the field may be absent. */
export interface LocationBackfillSummary {
  backfilled: boolean;
  transactions: number;
  customers: number;
}

export interface LocationCreateResponse extends Location {
  backfill?: LocationBackfillSummary;
}

export interface LocationPatch {
  name?: string;
  slug?: string;
  address?: string;
  address_components?: AddressComponents | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number;
  is_primary?: boolean;
  wallet_message?: LocalizedWalletMessage | null;
}

export interface SlugAvailabilityResponse {
  available: boolean;
  normalized: string;
}

export interface LocationMatch {
  location_id: string;
  distance_meters: number;
  confidence: 'high' | 'medium' | 'low';
  suggested: boolean;
}

export interface LocationQRResponse {
  enrollment_url: string;
  qr_png_base64: string | null;
  location_id: string;
  location_slug: string;
  business_slug: string;
}

export interface LocationMember {
  membership_id: string;
  user_id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'scanner';
  assigned_at: string;
}

export interface LocationAssignment {
  id: string;
  location_id: string;
  membership_id: string;
  created_at: string;
}

export type LocationStatsRange = '7d' | '30d' | '90d' | 'all';

export interface LocationStats {
  location_id: string;
  location_name: string;
  range: LocationStatsRange;
  total_transactions: number;
  stamps_added: number;
  rewards_redeemed: number;
  stamps_voided: number;
  unique_customers: number;
  enrolled_here_total: number;
}

/** Batch stats returned by `GET /locations/{businessId}/stats?range=…` — one
 *  row per active location. Same shape as `LocationStats` plus `last_activity_at`,
 *  the most recent transaction timestamp within the range (null if none). The
 *  activity chip on `LocationCard` derives Active-today / Quiet-7d+ from this. */
export interface LocationStatsBatchRow extends LocationStats {
  last_activity_at: string | null;
}

export type LocationStatsBatch = LocationStatsBatchRow[];
