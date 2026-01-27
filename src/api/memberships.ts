import { API_BASE_URL, getAuthHeaders } from './client';
import type { User, MembershipWithUser, MembershipCreate, MembershipUpdate } from '@/types';

export async function getBusinessMembers(businessId: string): Promise<MembershipWithUser[]> {
  const response = await fetch(`${API_BASE_URL}/memberships/business/${businessId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch members');
  }

  return response.json();
}

export async function getUserByEmail(email: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(email)}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('User not found');
    }
    throw new Error('Failed to find user');
  }

  return response.json();
}

export async function createMembership(data: MembershipCreate): Promise<MembershipWithUser> {
  const response = await fetch(`${API_BASE_URL}/memberships`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create membership');
  }

  return response.json();
}

export async function updateMembershipRole(membershipId: string, data: MembershipUpdate): Promise<MembershipWithUser> {
  const response = await fetch(`${API_BASE_URL}/memberships/${membershipId}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to update membership');
  }

  return response.json();
}

export async function deleteMembership(membershipId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/memberships/${membershipId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to delete membership');
  }
}
