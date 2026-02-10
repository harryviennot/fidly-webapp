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

export async function getAuthHeadersForFormData(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return {
    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
  };
}
