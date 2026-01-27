import {
  CustomerCreate,
  CustomerResponse,
  StampResponse,
  CardDesign,
  CardDesignCreate,
  CardDesignUpdate,
  UploadResponse,
  User,
  MembershipWithUser,
  MembershipCreate,
  MembershipUpdate,
} from './types';
import { createClient } from './supabase/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return {
    'Content-Type': 'application/json',
    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
  };
}

async function getAuthHeadersForFormData(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return {
    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
  };
}

export async function createCustomer(businessId: string, data: CustomerCreate): Promise<CustomerResponse> {
  const response = await fetch(`${API_BASE_URL}/customers/${businessId}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create customer');
  }

  return response.json();
}

export async function getCustomer(businessId: string, customerId: string): Promise<CustomerResponse> {
  const response = await fetch(`${API_BASE_URL}/customers/${businessId}/${customerId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Customer not found');
  }

  return response.json();
}

export async function getAllCustomers(businessId: string): Promise<CustomerResponse[]> {
  const response = await fetch(`${API_BASE_URL}/customers/${businessId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch customers');
  }

  return response.json();
}

export async function addStamp(customerId: string): Promise<StampResponse> {
  const response = await fetch(`${API_BASE_URL}/stamps/${customerId}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to add stamp');
  }

  return response.json();
}

// Card Design API

export async function getDesigns(businessId: string): Promise<CardDesign[]> {
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch designs');
  }

  return response.json();
}

export async function getActiveDesign(businessId: string): Promise<CardDesign | null> {
  // Note: Active design endpoint is public for pass generation
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/active`);

  if (!response.ok) {
    throw new Error('Failed to fetch active design');
  }

  const data = await response.json();
  return data || null;
}

export async function getDesign(businessId: string, designId: string): Promise<CardDesign> {
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Design not found');
  }

  return response.json();
}

export async function createDesign(businessId: string, data: CardDesignCreate): Promise<CardDesign> {
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create design');
  }

  return response.json();
}

export async function updateDesign(businessId: string, designId: string, data: CardDesignUpdate): Promise<CardDesign> {
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to update design');
  }

  return response.json();
}

export async function deleteDesign(businessId: string, designId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to delete design');
  }
}

export async function activateDesign(businessId: string, designId: string): Promise<CardDesign> {
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}/activate`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to activate design');
  }

  return response.json();
}

export async function uploadLogo(businessId: string, designId: string, file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}/upload/logo`, {
    method: 'POST',
    headers: await getAuthHeadersForFormData(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to upload logo');
  }

  return response.json();
}

export async function uploadStamp(
  businessId: string,
  designId: string,
  file: File,
  type: 'filled' | 'empty'
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}/upload/stamp/${type}`, {
    method: 'POST',
    headers: await getAuthHeadersForFormData(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to upload stamp');
  }

  return response.json();
}

// Membership API

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
