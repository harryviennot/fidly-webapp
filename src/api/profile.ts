import { API_BASE_URL, getAuthHeaders, getAuthHeadersForFormData } from './client';
import type { User } from '@/types';

export async function getMyProfile(): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/profile/me`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to get profile');
  }

  return response.json();
}

export async function uploadAvatar(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
    method: 'POST',
    headers: await getAuthHeadersForFormData(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to upload avatar');
  }

  return response.json();
}

export async function deleteAvatar(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to delete avatar');
  }
}

export async function updateProfile(data: { name?: string }): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/profile/me`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to update profile');
  }

  return response.json();
}
