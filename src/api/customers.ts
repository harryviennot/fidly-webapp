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

export async function addStamp(customerId: string): Promise<StampResponse> {
  const response = await fetch(`${API_BASE_URL}/stamps/${customerId}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to add stamp');
  }

  return response.json();
}
