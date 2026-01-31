import { API_BASE_URL, getAuthHeaders, getAuthHeadersForFormData } from './client';
import type { CardDesign, CardDesignCreate, CardDesignUpdate, UploadResponse } from '@/types';

export async function getDesigns(businessId: string): Promise<CardDesign[]> {
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch designs');
  }

  return response.json();
}

export async function getActiveDesign(businessId: string): Promise<CardDesign | null> {
  // Note: Active design endpoint is public for pass generation
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/active`);

  if (!response.ok) {
    throw new Error('Failed to fetch active design');
  }

  const data = await response.json();
  return data || null;
}

export async function getDesign(businessId: string, designId: string): Promise<CardDesign> {
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Design not found');
  }

  return response.json();
}

export async function createDesign(businessId: string, data: CardDesignCreate): Promise<CardDesign> {
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create design');
  }

  return response.json();
}

export async function updateDesign(businessId: string, designId: string, data: CardDesignUpdate): Promise<CardDesign> {
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to update design');
  }

  return response.json();
}

export async function deleteDesign(businessId: string, designId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to delete design');
  }
}

export async function activateDesign(businessId: string, designId: string): Promise<CardDesign> {
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}/activate`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to activate design');
  }

  return response.json();
}

export async function uploadLogo(businessId: string, designId: string, file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}/upload/logo`, {
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

export async function uploadStamp(
  businessId: string,
  designId: string,
  file: File,
  type: 'filled' | 'empty'
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}/upload/stamp/${type}`, {
    method: 'POST',
    headers: await getAuthHeadersForFormData(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to upload stamp');
  }

  return response.json();
}

export async function uploadStripBackground(
  businessId: string,
  designId: string,
  file: File
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}/upload/strip-background`, {
    method: 'POST',
    headers: await getAuthHeadersForFormData(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to upload strip background');
  }

  return response.json();
}
