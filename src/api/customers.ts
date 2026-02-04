import { API_BASE_URL, getAuthHeaders } from './client';
import type { CustomerCreate, CustomerResponse, StampResponse } from '@/types';

export async function createCustomer(businessId: string, data: CustomerCreate): Promise<CustomerResponse> {
  const response = await fetch(`${API_BASE_URL}/customers/${businessId}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create customer');
  }

  return response.json();
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

export async function getAllCustomers(businessId: string): Promise<CustomerResponse[]> {
  const response = await fetch(`${API_BASE_URL}/customers/${businessId}`, {
    headers: await getAuthHeaders(),
  });

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
