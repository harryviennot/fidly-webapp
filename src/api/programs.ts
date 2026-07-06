import { API_BASE_URL, getAuthHeaders, extractErrorMessage, throwApiError } from './client';
import type {
  ConversionPreview,
  ConversionPreviewRequest,
  ConvertRequest,
  ConvertResult,
  LoyaltyProgram,
  LoyaltyProgramUpdate,
  ProgramConversion,
  ProgramCreate,
  StampGoalImpact,
} from '@/types';

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

/**
 * Impact preview for the conversion wizard. Read-only and repeat-safe: the
 * wizard calls it (debounced) while the owner tweaks the rate and policy.
 */
export async function previewConversion(
  businessId: string,
  programId: string,
  data: ConversionPreviewRequest
): Promise<ConversionPreview> {
  const response = await fetch(
    `${API_BASE_URL}/programs/${businessId}/${programId}/convert/preview`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to preview conversion');
  }

  return response.json();
}

/**
 * Execute the program-type conversion (stamp <-> points). Atomic on the
 * backend; pass pushes fan out afterwards — follow progress via
 * getConversions(latest) or the program_conversions realtime channel.
 * Coded failures: TYPE_ALREADY_CONVERTED / CONVERSION_IN_PROGRESS (409, the
 * ApiError.detail carries conversion_id so the wizard can attach to the
 * in-flight progress screen), DESIGN_TYPE_MISMATCH / DESIGN_NOT_READY (422).
 */
export async function convertProgram(
  businessId: string,
  programId: string,
  data: ConvertRequest
): Promise<ConvertResult> {
  const response = await fetch(
    `${API_BASE_URL}/programs/${businessId}/${programId}/convert`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to convert program');
  }

  return response.json();
}

/** Conversion history (newest first). `latest: true` returns at most one row —
 * the wizard's progress-poll fallback and the churn-guard/nudge input. */
export async function getConversions(
  businessId: string,
  programId: string,
  opts?: { latest?: boolean }
): Promise<ProgramConversion[]> {
  const suffix = opts?.latest ? '?latest=true' : '';
  const response = await fetch(
    `${API_BASE_URL}/programs/${businessId}/${programId}/conversions${suffix}`,
    { headers: await getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch conversions');
  }

  const data = await response.json();
  return data.conversions ?? [];
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
