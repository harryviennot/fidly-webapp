import { API_BASE_URL, getAuthHeaders, getAuthHeadersForFormData, extractErrorMessage } from './client';
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
    throw new Error(extractErrorMessage(error, 'Failed to update business'));
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
    throw new Error(extractErrorMessage(error, 'Failed to upload logo'));
  }

  return response.json();
}

export interface SignupQRResponse {
  qr_code: string;
  signup_url: string;
  business_name: string;
}

export async function getBusinessSignupQR(businessId: string): Promise<SignupQRResponse> {
  const response = await fetch(`${API_BASE_URL}/businesses/${businessId}/signup-qr`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, 'Failed to fetch QR code'));
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
    throw new Error(extractErrorMessage(error, 'Failed to delete logo'));
  }
}
