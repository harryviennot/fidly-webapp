import { API_BASE_URL, getAuthHeaders } from './client';
import type { TransactionListResponse } from '@/types/transaction';

interface TransactionParams {
  customer_id?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

function buildQuery(params?: TransactionParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.customer_id) search.set('customer_id', params.customer_id);
  if (params.type) search.set('type', params.type);
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
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
