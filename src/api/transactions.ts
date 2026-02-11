import { API_BASE_URL, getAuthHeaders } from './client';
import type { ActivityStatsResponse, TransactionListResponse } from '@/types/transaction';

interface TransactionParams {
  customer_id?: string;
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

function buildQuery(params?: TransactionParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.customer_id) qs.set('customer_id', params.customer_id);
  if (params.type) qs.set('type', params.type);
  if (params.search) qs.set('search', params.search);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
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
