import { createClient } from '@/utils/supabase/client';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
} else {
  console.log(`[API] API_BASE_URL: ${API_BASE_URL}`);
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return {
    'Content-Type': 'application/json',
    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
  };
}

/**
 * Structured API error preserving the backend error code for frontend translation.
 *
 * Backend returns: { detail: { code, message, feature?, required_tier?, ... } }
 * This class keeps the code so components can map it to a translated string.
 */
export class ApiError extends Error {
  code: string | undefined;
  feature: string | undefined;
  requiredTier: string | undefined;
  limit: number | undefined;
  current: number | undefined;

  constructor(message: string, detail?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = detail?.code as string | undefined;
    this.feature = detail?.feature as string | undefined;
    this.requiredTier = detail?.required_tier as string | undefined;
    this.limit = detail?.limit as number | undefined;
    this.current = detail?.current as number | undefined;
  }
}

/**
 * Extract a human-readable error message from an API error response.
 * Handles both string detail (legacy) and object detail (standardized errors).
 */
export function extractErrorMessage(error: Record<string, unknown>, fallback: string): string {
  const detail = error.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && 'message' in detail) {
    return (detail as { message: string }).message;
  }
  return fallback;
}

/**
 * Throw an ApiError from an API error response.
 * Preserves the structured error code for frontend translation.
 */
export function throwApiError(error: Record<string, unknown>, fallback: string): never {
  const detail = error.detail;
  if (detail && typeof detail === 'object') {
    const d = detail as Record<string, unknown>;
    const message = (d.message as string) || fallback;
    throw new ApiError(message, d);
  }
  throw new ApiError(typeof detail === 'string' ? detail : fallback);
}

export async function getAuthHeadersForFormData(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return {
    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
  };
}
