import { API_BASE_URL, getAuthHeaders, extractErrorMessage } from './client';
import type { CustomerResponse, PaginatedCustomerResponse, StampResponse } from '@/types';

export async function getCustomer(businessId: string, customerId: string): Promise<CustomerResponse> {
  const response = await fetch(`${API_BASE_URL}/customers/${businessId}/${customerId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Customer not found');
  }

  return response.json();
}

export async function getCustomers(
  businessId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<PaginatedCustomerResponse> {
  const response = await fetch(
    `${API_BASE_URL}/customers/${businessId}?limit=${limit}&offset=${offset}`,
    { headers: await getAuthHeaders() },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch customers');
  }

  return response.json();
}

export async function addStamp(businessId: string, enrollmentId: string): Promise<StampResponse> {
  const response = await fetch(`${API_BASE_URL}/stamps/${businessId}/${enrollmentId}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Not authorized to add stamps');
    }
    if (response.status === 403) {
      throw new Error('You don\'t have access to this business');
    }
    if (response.status === 404) {
      throw new Error('Enrollment not found');
    }
    throw new Error('Failed to add stamp');
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
