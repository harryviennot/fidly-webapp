import {
  API_BASE_URL,
  clearImpersonationToken,
  extractErrorMessage,
  getAuthHeaders,
  setImpersonationToken,
} from './client';

export interface ImpersonationBusinessUser {
  user_id: string;
  name: string | null;
  email: string | null;
  role: "owner" | "admin" | "scanner";
  last_active_at: string | null;
}

export interface StartImpersonationBody {
  business_id: string;
  mode: "by_role" | "by_user";
  reason: string;
  role?: "owner" | "admin" | "scanner";
  target_user_id?: string;
}

export interface StartImpersonationResponse {
  session_id: string;
  target_user_id: string;
  target_role: "owner" | "admin" | "scanner";
  expires_at: string;
  redirect_url: string;
  token: string;
}

export interface CurrentImpersonationSession {
  session_id: string;
  business_id: string;
  business_name: string | null;
  target_user_id: string;
  target_user_name: string | null;
  target_role: "owner" | "admin" | "scanner";
  selection_mode: "by_role" | "by_user";
  expires_at: string;
  granted_at: string;
  reason: string;
}

export async function listBusinessUsersForImpersonation(
  businessId: string,
): Promise<ImpersonationBusinessUser[]> {
  const response = await fetch(
    `${API_BASE_URL}/admin/impersonation/business/${businessId}/users`,
    { headers: await getAuthHeaders() },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, 'Failed to load business users'));
  }
  return response.json();
}

export async function startImpersonation(
  body: StartImpersonationBody,
): Promise<StartImpersonationResponse> {
  const response = await fetch(`${API_BASE_URL}/admin/impersonation/start`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, 'Failed to start impersonation'));
  }
  const data: StartImpersonationResponse = await response.json();
  // Store the token before the redirect — the backend recognises it on the
  // next page load via the X-Impersonation-Token header, which is more
  // robust than relying on cross-origin cookies in dev.
  setImpersonationToken(data.token);
  return data;
}

export async function endImpersonation(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/admin/impersonation/end`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      credentials: 'include',
    });
  } finally {
    clearImpersonationToken();
  }
}

export async function getCurrentImpersonation(): Promise<CurrentImpersonationSession | null> {
  const response = await fetch(`${API_BASE_URL}/admin/impersonation/current`, {
    headers: await getAuthHeaders(),
    credentials: 'include',
  });
  if (response.status === 204) return null;
  if (!response.ok) return null;
  return response.json();
}
