import { CustomerCreate, CustomerResponse, StampResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function createCustomer(data: CustomerCreate): Promise<CustomerResponse> {
  const response = await fetch(`${API_BASE_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create customer');
  }

  return response.json();
}

export async function getCustomer(id: string): Promise<CustomerResponse> {
  const response = await fetch(`${API_BASE_URL}/customers/${id}`);

  if (!response.ok) {
    throw new Error('Customer not found');
  }

  return response.json();
}

export async function getAllCustomers(): Promise<CustomerResponse[]> {
  const response = await fetch(`${API_BASE_URL}/customers`);

  if (!response.ok) {
    throw new Error('Failed to fetch customers');
  }

  return response.json();
}

export async function addStamp(customerId: string): Promise<StampResponse> {
  const response = await fetch(`${API_BASE_URL}/stamps/${customerId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to add stamp');
  }

  return response.json();
}
