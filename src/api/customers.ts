import { API_BASE_URL, getAuthHeaders, extractErrorMessage, throwApiError } from './client';
import type { CustomerResponse, PaginatedCustomerResponse, StampResponse } from '@/types';

export interface AddStampOptions {
  /**
   * Discriminator picked up by the backend.
   *   - "scanner" (default, sent as no body) — physical-scan flow, used by
   *     the onboarding self-test. Reason MUST be absent.
   *   - "dashboard" — owner/admin manual adjustment, reason REQUIRED.
   */
  source?: 'dashboard';
  /** Required when source === "dashboard". 1–280 chars, surfaced in activity. */
  reason?: string;
  /**
   * Optional. Honored only for Pro businesses that have at least one active
   * location. Null/undefined → transaction lands with location_id = NULL.
   */
  locationId?: string | null;
}

export async function getCustomer(businessId: string, customerId: string): Promise<CustomerResponse> {
  const response = await fetch(`${API_BASE_URL}/customers/${businessId}/${customerId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Customer not found');
  }

  return response.json();
}

export interface CustomerListParams {
  limit?: number;
  offset?: number;
  /** Free-text match on name OR email, applied server-side across the whole business. */
  search?: string;
  /** "all" or a CustomerSegment. "all" is omitted from the request. */
  segment?: string;
  /** API sort key: "name" | "stamps" | "last_activity" | "total_redemptions". */
  sort?: string;
  sortDir?: 'asc' | 'desc';
}

export async function getCustomers(
  businessId: string,
  params: CustomerListParams = {},
): Promise<PaginatedCustomerResponse> {
  const { limit = 50, offset = 0, search, segment, sort, sortDir } = params;
  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  qs.set('offset', String(offset));
  if (search) qs.set('search', search);
  if (segment && segment !== 'all') qs.set('segment', segment);
  if (sort) qs.set('sort', sort);
  if (sortDir) qs.set('sort_dir', sortDir);

  const response = await fetch(
    `${API_BASE_URL}/customers/${businessId}?${qs.toString()}`,
    { headers: await getAuthHeaders() },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch customers');
  }

  return response.json();
}

/** Whole-business per-segment counts for the list filter pills. Narrowed by
 *  `search` (so pills stay coherent with results) but not by selected segment.
 *  Returns a { segment: count } map; missing segments are absent (treat as 0). */
export async function getCustomerSegmentCounts(
  businessId: string,
  search?: string,
): Promise<Record<string, number>> {
  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const response = await fetch(
    `${API_BASE_URL}/customers/${businessId}/segment-counts${suffix}`,
    { headers: await getAuthHeaders() },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch segment counts');
  }

  return response.json();
}

export async function addStamp(
  businessId: string,
  enrollmentId: string,
  options?: AddStampOptions
): Promise<StampResponse> {
  // Omit the body entirely on a default (scanner) call so the backend's
  // `body: StampRequest | None = None` short-circuit applies cleanly.
  const hasBody = !!options;
  const body = hasBody
    ? JSON.stringify({
        source: options!.source ?? 'dashboard',
        ...(options!.reason !== undefined && { reason: options!.reason }),
        ...(options!.locationId !== undefined && { location_id: options!.locationId }),
      })
    : undefined;

  const response = await fetch(`${API_BASE_URL}/stamps/${businessId}/${enrollmentId}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    ...(body && { body }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to add stamp');
  }

  return response.json();
}

export async function redeemReward(
  businessId: string,
  enrollmentId: string
): Promise<StampResponse> {
  const response = await fetch(
    `${API_BASE_URL}/stamps/${businessId}/${enrollmentId}/redeem`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, 'Failed to redeem reward'));
  }

  return response.json();
}

export interface PublicCustomerCreatePayload {
  name?: string;
  email?: string;
  phone?: string;
}

export interface PublicCustomerResponse {
  status: 'created' | 'exists_email_sent';
  customer_id?: string;
  pass_url?: string;
  google_wallet_url?: string;
  message: string;
}

/**
 * Public customer creation — no auth header required. Used by the launch
 * wizard's First Customer step so the owner can self-install their own
 * card. Returns pass install URLs (Apple + Google) and the customer ID.
 *
 * `pass_url` is the canonical pass-install URL of the form
 * `/passes/{enrollment_id}` — the trailing segment is the enrollment ID
 * we'll need to fire a test stamp later in the wizard.
 */
export async function createPublicCustomer(
  businessId: string,
  payload: PublicCustomerCreatePayload
): Promise<PublicCustomerResponse> {
  const response = await fetch(`${API_BASE_URL}/public/customers/${businessId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, 'Failed to register customer'));
  }
  return response.json();
}

/** Pulls the trailing `/passes/{id}` segment out of a pass URL. */
export function enrollmentIdFromPassUrl(passUrl: string | undefined | null): string | null {
  if (!passUrl) return null;
  const match = passUrl.match(/\/passes\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export interface WalletInstallStatus {
  installed: boolean;
  apple: boolean;
  google: boolean;
}

/**
 * Polled by the launch wizard's First Customer step to detect when the owner
 * (or their demo customer) actually adds the card to their wallet. The
 * backend reads `push_registrations` rows for the customer; presence of any
 * registration = pass installed (same signal the demo landing page uses).
 */
export async function getCustomerWalletStatus(
  businessId: string,
  customerOrEnrollmentId: string
): Promise<WalletInstallStatus> {
  const response = await fetch(
    `${API_BASE_URL}/customers/${businessId}/${customerOrEnrollmentId}/wallet-status`,
    { headers: await getAuthHeaders() }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, 'Failed to fetch wallet status'));
  }
  return response.json();
}

export interface SendPassResponse {
  status: string;
  email: string;
  email_saved: boolean;
}

/**
 * Email a customer their wallet card (Apple + Google links). Owners/admins only.
 * When `email` is provided it's persisted onto the customer record (unless it
 * already belongs to another customer in the business). Required when the
 * customer has no email on file.
 */
export async function sendCustomerPass(
  businessId: string,
  customerId: string,
  email?: string
): Promise<SendPassResponse> {
  const response = await fetch(
    `${API_BASE_URL}/customers/${businessId}/${customerId}/send-pass`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(email ? { email } : {}),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, 'Failed to send the card'));
  }

  return response.json();
}

export async function voidStamp(
  businessId: string,
  enrollmentId: string,
  transactionId: string,
  reason: string
): Promise<StampResponse> {
  const response = await fetch(
    `${API_BASE_URL}/stamps/${businessId}/${enrollmentId}/void`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ transaction_id: transactionId, reason }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, 'Failed to void stamp'));
  }

  return response.json();
}
