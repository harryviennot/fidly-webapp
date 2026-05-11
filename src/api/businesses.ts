import { API_BASE_URL, getAuthHeaders, getAuthHeadersForFormData, extractErrorMessage } from './client';
import type { Business, BusinessUpdate } from '@/types/business';

export interface BusinessListItem extends Business {
  role: "owner" | "admin" | "scanner" | null;
  owner_id?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
}

export interface BusinessListResponse {
  items: BusinessListItem[];
  total: number;
  limit: number;
  offset: number;
  scope: "mine" | "all";
}

export interface BusinessListParams {
  limit?: number;
  offset?: number;
  search?: string;
  scope?: "mine" | "all";
}

export async function fetchBusinessesList(
  params: BusinessListParams = {},
): Promise<BusinessListResponse> {
  const qs = new URLSearchParams();
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.offset !== undefined) qs.set("offset", String(params.offset));
  if (params.search) qs.set("search", params.search);
  if (params.scope) qs.set("scope", params.scope);

  const response = await fetch(`${API_BASE_URL}/businesses/list?${qs.toString()}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, 'Failed to fetch businesses'));
  }

  return response.json();
}

export interface BusinessCreatePayload {
  name: string;
  url_slug: string;
  subscription_tier: 'starter' | 'growth' | 'pro';
  settings?: Record<string, unknown>;
  logo_url?: string | null;
  website?: string;
  primary_locale?: 'fr' | 'en';
}

export async function createBusiness(payload: BusinessCreatePayload): Promise<Business> {
  const response = await fetch(`${API_BASE_URL}/businesses`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, 'Failed to create business'));
  }

  return response.json();
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean; reason?: string }> {
  if (!slug || slug.length < 3) {
    return { available: false, reason: 'Slug must be at least 3 characters' };
  }
  const response = await fetch(`${API_BASE_URL}/businesses/slug/${encodeURIComponent(slug)}/available`);
  if (!response.ok) {
    return { available: false, reason: 'Failed to check availability' };
  }
  return response.json();
}

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
