import { API_BASE_URL, getAuthHeaders } from './client';
import type {
  Invitation,
  InvitationPublic,
  InvitationCreate,
  InvitationAcceptResponse,
} from '@/types';

export async function createInvitation(
  businessId: string,
  data: InvitationCreate
): Promise<Invitation> {
  const response = await fetch(`${API_BASE_URL}/invitations/${businessId}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create invitation');
  }

  return response.json();
}

export async function getPendingInvitations(businessId: string): Promise<Invitation[]> {
  const response = await fetch(`${API_BASE_URL}/invitations/${businessId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch invitations');
  }

  return response.json();
}

export async function getInvitationByToken(token: string): Promise<InvitationPublic> {
  // No auth headers - this is a public endpoint
  const response = await fetch(`${API_BASE_URL}/invitations/token/${token}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Invitation not found');
    }
    throw new Error('Failed to fetch invitation');
  }

  return response.json();
}

export async function acceptInvitation(token: string): Promise<InvitationAcceptResponse> {
  const response = await fetch(`${API_BASE_URL}/invitations/token/${token}/accept`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to accept invitation');
  }

  return response.json();
}

export async function resendInvitation(
  businessId: string,
  invitationId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/invitations/${businessId}/${invitationId}/resend`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to resend invitation');
  }
}

export async function cancelInvitation(
  businessId: string,
  invitationId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/invitations/${businessId}/${invitationId}`,
    {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to cancel invitation');
  }
}
