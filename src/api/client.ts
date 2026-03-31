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

export async function getAuthHeadersForFormData(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return {
    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
  };
}
