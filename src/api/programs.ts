import { API_BASE_URL, getAuthHeaders, extractErrorMessage } from './client';
import type { LoyaltyProgram, LoyaltyProgramUpdate } from '@/types';

export async function getPrograms(businessId: string): Promise<LoyaltyProgram[]> {
  const response = await fetch(`${API_BASE_URL}/programs/${businessId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch programs');
  }

  return response.json();
}

export async function getProgram(businessId: string, programId: string): Promise<LoyaltyProgram> {
  const response = await fetch(`${API_BASE_URL}/programs/${businessId}/${programId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Program not found');
  }

  return response.json();
}

export async function updateProgram(
  businessId: string,
  programId: string,
  data: LoyaltyProgramUpdate
): Promise<LoyaltyProgram> {
  const response = await fetch(`${API_BASE_URL}/programs/${businessId}/${programId}`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, 'Failed to update program'));
  }

  return response.json();
}
