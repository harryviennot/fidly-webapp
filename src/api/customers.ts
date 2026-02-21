import { API_BASE_URL, getAuthHeaders } from './client';
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

export async function addStamp(businessId: string, customerId: string): Promise<StampResponse> {
  const response = await fetch(`${API_BASE_URL}/stamps/${businessId}/${customerId}`, {
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
      throw new Error('Customer not found');
    }
    throw new Error('Failed to add stamp');
  }

  return response.json();
}

export async function redeemReward(
  businessId: string,
  customerId: string
): Promise<StampResponse> {
  const response = await fetch(
    `${API_BASE_URL}/stamps/${businessId}/${customerId}/redeem`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to redeem reward');
  }

  return response.json();
}

export async function voidStamp(
  businessId: string,
  customerId: string,
  transactionId: string,
  reason: string
): Promise<StampResponse> {
  const response = await fetch(
    `${API_BASE_URL}/stamps/${businessId}/${customerId}/void`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ transaction_id: transactionId, reason }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to void stamp');
  }

  return response.json();
}
