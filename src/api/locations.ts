import { API_BASE_URL, getAuthHeaders, throwApiError } from './client';
import type {
  Location,
  LocationCreate,
  LocationPatch,
  LocationMatch,
  LocationMember,
  LocationQRResponse,
  LocationStats,
  LocationStatsBatch,
  LocationStatsRange,
  LocationAssignment,
  SlugAvailabilityResponse,
} from '@/types/location';

export async function getLocations(businessId: string): Promise<Location[]> {
  const response = await fetch(`${API_BASE_URL}/locations/${businessId}`, {
    headers: await getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to fetch locations');
  }
  return response.json();
}

export async function createLocation(
  businessId: string,
  body: LocationCreate
): Promise<Location> {
  const response = await fetch(`${API_BASE_URL}/locations/${businessId}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to create location');
  }
  return response.json();
}

export async function updateLocation(
  businessId: string,
  locationId: string,
  body: LocationPatch
): Promise<Location> {
  const response = await fetch(
    `${API_BASE_URL}/locations/${businessId}/${locationId}`,
    {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to update location');
  }
  return response.json();
}

export async function deleteLocation(
  businessId: string,
  locationId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/locations/${businessId}/${locationId}`,
    {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to delete location');
  }
}

export async function checkLocationSlugAvailability(
  businessId: string,
  slug: string,
  excludeId?: string
): Promise<SlugAvailabilityResponse> {
  const qs = new URLSearchParams({ slug });
  if (excludeId) qs.set('exclude_id', excludeId);
  const response = await fetch(
    `${API_BASE_URL}/locations/${businessId}/check-slug?${qs}`,
    { headers: await getAuthHeaders() }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to check slug availability');
  }
  return response.json();
}

/** Closest-location match for a coordinate. Web v1 doesn't call this; kept
 *  for parity with the backend surface in case future flows need it. */
export async function matchLocation(
  businessId: string,
  lat: number,
  lng: number
): Promise<LocationMatch> {
  const qs = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  const response = await fetch(
    `${API_BASE_URL}/locations/${businessId}/match?${qs}`,
    { headers: await getAuthHeaders() }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to match location');
  }
  return response.json();
}

export async function getLocationQR(
  businessId: string,
  locationId: string
): Promise<LocationQRResponse> {
  const response = await fetch(
    `${API_BASE_URL}/locations/${businessId}/${locationId}/qr`,
    { headers: await getAuthHeaders() }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to generate QR');
  }
  return response.json();
}

export async function getLocationMembers(
  businessId: string,
  locationId: string
): Promise<LocationMember[]> {
  const response = await fetch(
    `${API_BASE_URL}/locations/${businessId}/${locationId}/members`,
    { headers: await getAuthHeaders() }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to fetch location members');
  }
  return response.json();
}

export async function assignLocationMember(
  businessId: string,
  locationId: string,
  membershipId: string
): Promise<LocationAssignment> {
  const response = await fetch(
    `${API_BASE_URL}/locations/${businessId}/${locationId}/members`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ membership_id: membershipId }),
    }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to assign member');
  }
  return response.json();
}

export async function unassignLocationMember(
  businessId: string,
  locationId: string,
  membershipId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/locations/${businessId}/${locationId}/members/${membershipId}`,
    {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to unassign member');
  }
}

export async function getLocationStats(
  businessId: string,
  locationId: string,
  range: LocationStatsRange = '30d'
): Promise<LocationStats> {
  const qs = new URLSearchParams({ range });
  const response = await fetch(
    `${API_BASE_URL}/locations/${businessId}/${locationId}/stats?${qs}`,
    { headers: await getAuthHeaders() }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to fetch location stats');
  }
  return response.json();
}

export async function getLocationStatsBatch(
  businessId: string,
  range: LocationStatsRange = '7d'
): Promise<LocationStatsBatch> {
  const qs = new URLSearchParams({ range });
  const response = await fetch(
    `${API_BASE_URL}/locations/${businessId}/stats?${qs}`,
    { headers: await getAuthHeaders() }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to fetch location stats batch');
  }
  return response.json();
}
