import { API_BASE_URL, getAuthHeaders, getAuthHeadersForFormData } from './client';
import type { Business, BusinessUpdate } from '@/types/business';

export async function updateBusiness(
  businessId: string,
  data: BusinessUpdate
): Promise<Business> {
  const response = await fetch(`${API_BASE_URL}/businesses/${businessId}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to update business');
  }

  return response.json();
}

export async function uploadBusinessLogo(
  businessId: string,
  file: File
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/businesses/${businessId}/logo`, {
    method: 'POST',
    headers: await getAuthHeadersForFormData(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to upload logo');
  }

  return response.json();
}

export async function deleteBusinessLogo(businessId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/businesses/${businessId}/logo`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to delete logo');
  }
}
