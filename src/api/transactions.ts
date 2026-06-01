import { API_BASE_URL, getAuthHeaders, throwApiError } from './client';
import type {
  ActivityStatsResponse,
  TransactionListResponse,
  TransactionResponse,
} from '@/types/transaction';

export interface TransactionParams {
  customer_id?: string;
  type?: string;
  limit?: number;
  offset?: number;
  /** Location filter. UUID for a specific location, '__none__' for legacy
   *  NULL-location rows only. Omit for all locations. */
  location_id?: string | '__none__';
  /** When `location_id` is a UUID, also include legacy NULL rows. Defaults
   *  server-side to true so existing pages don't suddenly look empty. */
  include_legacy?: boolean;
}

function buildQuery(params?: TransactionParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.customer_id) qs.set('customer_id', params.customer_id);
  if (params.type) qs.set('type', params.type);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  if (params.location_id) qs.set('location_id', params.location_id);
  if (params.include_legacy != null) qs.set('include_legacy', String(params.include_legacy));
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export async function getTransactions(
  businessId: string,
  params?: TransactionParams
): Promise<TransactionListResponse> {
  const response = await fetch(
    `${API_BASE_URL}/transactions/${businessId}${buildQuery(params)}`,
    { headers: await getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch transactions');
  }

  return response.json();
}

export async function getCustomerTransactions(
  businessId: string,
  customerId: string,
  params?: Omit<TransactionParams, 'customer_id'>
): Promise<TransactionListResponse> {
  const response = await fetch(
    `${API_BASE_URL}/transactions/${businessId}/${customerId}${buildQuery(params)}`,
    { headers: await getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch customer transactions');
  }

  return response.json();
}

export async function getActivityStats(
  businessId: string
): Promise<ActivityStatsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/transactions/${businessId}/stats`,
    { headers: await getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch activity stats');
  }

  return response.json();
}

/** Admin correction of a transaction's location_id. Appends an audit entry
 *  to metadata.location_history. Does NOT regenerate the wallet pass. */
export async function patchTransactionLocation(
  businessId: string,
  transactionId: string,
  locationId: string | null
): Promise<TransactionResponse> {
  const response = await fetch(
    `${API_BASE_URL}/transactions/${businessId}/${transactionId}/location`,
    {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ location_id: locationId }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to update transaction location');
  }

  return response.json();
}
