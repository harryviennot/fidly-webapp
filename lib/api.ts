import {
  CustomerCreate,
  CustomerResponse,
  StampResponse,
  CardDesign,
  CardDesignCreate,
  CardDesignUpdate,
  UploadResponse,
} from './types';

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

// Card Design API

export async function getDesigns(): Promise<CardDesign[]> {
  const response = await fetch(`${API_BASE_URL}/designs`);

  if (!response.ok) {
    throw new Error('Failed to fetch designs');
  }

  return response.json();
}

export async function getActiveDesign(): Promise<CardDesign | null> {
  const response = await fetch(`${API_BASE_URL}/designs/active`);

  if (!response.ok) {
    throw new Error('Failed to fetch active design');
  }

  const data = await response.json();
  return data || null;
}

export async function getDesign(id: string): Promise<CardDesign> {
  const response = await fetch(`${API_BASE_URL}/designs/${id}`);

  if (!response.ok) {
    throw new Error('Design not found');
  }

  return response.json();
}

export async function createDesign(data: CardDesignCreate): Promise<CardDesign> {
  const response = await fetch(`${API_BASE_URL}/designs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create design');
  }

  return response.json();
}

export async function updateDesign(id: string, data: CardDesignUpdate): Promise<CardDesign> {
  const response = await fetch(`${API_BASE_URL}/designs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to update design');
  }

  return response.json();
}

export async function deleteDesign(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/designs/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to delete design');
  }
}

export async function activateDesign(id: string): Promise<CardDesign> {
  const response = await fetch(`${API_BASE_URL}/designs/${id}/activate`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to activate design');
  }

  return response.json();
}

export async function uploadLogo(designId: string, file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/designs/${designId}/upload/logo`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to upload logo');
  }

  return response.json();
}

export async function uploadStamp(
  designId: string,
  file: File,
  type: 'filled' | 'empty'
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/designs/${designId}/upload/stamp/${type}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to upload stamp');
  }

  return response.json();
}
