import { API_BASE_URL, getAuthHeaders, extractErrorMessage } from './client';
import type { LoyaltyProgram, LoyaltyProgramUpdate, ProgramCreate, StampGoalImpact } from '@/types';

/**
 * Create the business's loyalty program. When the business has no customers
 * (onboarding), the backend deletes the existing default program and recreates
 * it with the chosen type — this is the only way to switch a program's type.
 * Throws with the backend error message on 403 (tier gate) / 409 (has customers).
 */
export async function createProgram(
  businessId: string,
  data: ProgramCreate
): Promise<LoyaltyProgram> {
  const response = await fetch(`${API_BASE_URL}/programs/${businessId}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, 'Failed to create program'));
  }

  return response.json();
}

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

export async function getStampGoalImpact(
  businessId: string,
  programId: string,
  newTotal: number
): Promise<StampGoalImpact> {
  const response = await fetch(
    `${API_BASE_URL}/programs/${businessId}/${programId}/stamp-goal-impact?new_total=${newTotal}`,
    { headers: await getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch stamp goal impact');
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
