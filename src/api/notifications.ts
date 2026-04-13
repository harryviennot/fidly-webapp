import {
  API_BASE_URL,
  getAuthHeaders,
  getAuthHeadersForFormData,
  throwApiError,
} from './client';
import type {
  NotificationTemplate,
  NotificationTemplatesResponse,
  Broadcast,
  BroadcastListParams,
  PaginatedBroadcasts,
  BroadcastCreate,
  BroadcastUpdate,
  BroadcastTargetFilter,
  RecipientEstimate,
  BusinessIconUploadResponse,
  TriggerType,
  LocalizedBody,
} from '@/types/notification';

const USE_MOCKS = process.env.NEXT_PUBLIC_MOCK_NOTIFICATIONS === '1';

// ─────────────────────────────────────────────────────────────────────────
// Mock data — used when NEXT_PUBLIC_MOCK_NOTIFICATIONS=1
// Keeps Phase 0/1 UI work unblocked before backend endpoints ship.
// ─────────────────────────────────────────────────────────────────────────

const MOCK_TEMPLATES_RESPONSE: NotificationTemplatesResponse = {
  program_id: 'mock-program',
  tier: 'starter',
  items: [
    {
      template_id: null,
      trigger: 'stamp_added',
      body: {
        en: 'Stamp collected! You have {{stamp_count}} of {{total_stamps}} stamps.',
        fr: 'Tampon collecté ! Vous avez {{stamp_count}} sur {{total_stamps}} tampons.',
      },
      is_enabled: true,
      is_editable: false,
      is_customized: false,
    },
    {
      template_id: null,
      trigger: 'reward_earned',
      body: {
        en: 'You unlocked your reward! Come claim it.',
        fr: 'Vous avez débloqué votre récompense ! Venez la récupérer.',
      },
      is_enabled: true,
      is_editable: false,
      is_customized: false,
    },
    {
      template_id: null,
      trigger: 'reward_redeemed',
      body: {
        en: 'Reward redeemed. Enjoy your {{reward_name}}!',
        fr: 'Récompense utilisée. Profitez de votre {{reward_name}} !',
      },
      is_enabled: true,
      is_editable: false,
      is_customized: false,
    },
  ],
};

const MOCK_BROADCASTS: Broadcast[] = [];

// ─────────────────────────────────────────────────────────────────────────
// Transactional templates
// ─────────────────────────────────────────────────────────────────────────

export async function getNotificationTemplates(
  businessId: string,
  programId?: string
): Promise<NotificationTemplatesResponse> {
  if (USE_MOCKS) return MOCK_TEMPLATES_RESPONSE;

  const query = programId ? `?program_id=${encodeURIComponent(programId)}` : '';
  const response = await fetch(
    `${API_BASE_URL}/notifications/${businessId}/templates${query}`,
    { headers: await getAuthHeaders() }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to fetch notification templates');
  }

  return response.json();
}

export async function updateNotificationTemplate(
  businessId: string,
  trigger: TriggerType,
  body: LocalizedBody,
  triggerConfig?: { stamp_equals?: number; stamps_before_reward?: number }
): Promise<NotificationTemplate> {
  if (USE_MOCKS) {
    const existing = MOCK_TEMPLATES_RESPONSE.items.find(
      (t) => t.trigger === trigger
    );
    if (!existing) throw new Error(`Unknown trigger: ${trigger}`);
    existing.body = body;
    existing.is_customized = true;
    if (triggerConfig) existing.trigger_config = triggerConfig;
    return existing;
  }

  const response = await fetch(
    `${API_BASE_URL}/notifications/${businessId}/templates/${trigger}`,
    {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ body, trigger_config: triggerConfig }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to update notification template');
  }

  return response.json();
}

export async function resetNotificationTemplate(
  businessId: string,
  trigger: TriggerType
): Promise<void> {
  if (USE_MOCKS) {
    const existing = MOCK_TEMPLATES_RESPONSE.items.find(
      (t) => t.trigger === trigger
    );
    if (existing) existing.is_customized = false;
    return;
  }

  const response = await fetch(
    `${API_BASE_URL}/notifications/${businessId}/templates/${trigger}`,
    {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to reset notification template');
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Business icon upload
// ─────────────────────────────────────────────────────────────────────────

export async function uploadBusinessIcon(
  businessId: string,
  file: File
): Promise<BusinessIconUploadResponse> {
  if (USE_MOCKS) {
    return { url: URL.createObjectURL(file) };
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_BASE_URL}/businesses/${businessId}/icon`,
    {
      method: 'POST',
      headers: await getAuthHeadersForFormData(),
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to upload icon');
  }

  return response.json();
}

export async function deleteBusinessIcon(businessId: string): Promise<void> {
  if (USE_MOCKS) return;

  const response = await fetch(
    `${API_BASE_URL}/businesses/${businessId}/icon`,
    {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to delete icon');
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Broadcasts
// ─────────────────────────────────────────────────────────────────────────

export async function listBroadcasts(
  params: BroadcastListParams = {}
): Promise<PaginatedBroadcasts> {
  if (USE_MOCKS) {
    return {
      items: MOCK_BROADCASTS,
      next_cursor: null,
      total_this_month: 0,
    };
  }

  const query = new URLSearchParams();
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.limit) query.set('limit', params.limit.toString());

  const response = await fetch(
    `${API_BASE_URL}/broadcasts?${query.toString()}`,
    { headers: await getAuthHeaders() }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to fetch broadcasts');
  }

  return response.json();
}

export async function getBroadcast(id: string): Promise<Broadcast> {
  if (USE_MOCKS) {
    const b = MOCK_BROADCASTS.find((x) => x.id === id);
    if (!b) throw new Error('Broadcast not found');
    return b;
  }

  const response = await fetch(`${API_BASE_URL}/broadcasts/${id}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to fetch broadcast');
  }

  return response.json();
}

export async function createBroadcast(
  payload: BroadcastCreate
): Promise<Broadcast> {
  if (USE_MOCKS) {
    throw new Error('Broadcasts not available in mock mode');
  }

  const response = await fetch(`${API_BASE_URL}/broadcasts`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to create broadcast');
  }

  return response.json();
}

export async function updateBroadcast(
  id: string,
  payload: BroadcastUpdate
): Promise<Broadcast> {
  if (USE_MOCKS) {
    throw new Error('Broadcasts not available in mock mode');
  }

  const response = await fetch(`${API_BASE_URL}/broadcasts/${id}`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to update broadcast');
  }

  return response.json();
}

export async function deleteBroadcast(id: string): Promise<void> {
  if (USE_MOCKS) return;

  const response = await fetch(`${API_BASE_URL}/broadcasts/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to delete broadcast');
  }
}

export async function sendBroadcast(id: string): Promise<void> {
  if (USE_MOCKS) return;

  const response = await fetch(`${API_BASE_URL}/broadcasts/${id}/send`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to send broadcast');
  }
}

export async function estimateRecipients(
  filter: BroadcastTargetFilter
): Promise<RecipientEstimate> {
  if (USE_MOCKS) {
    return { count: Math.floor(Math.random() * 500) + 50 };
  }

  const response = await fetch(
    `${API_BASE_URL}/broadcasts/estimate-recipients`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(filter),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to estimate recipients');
  }

  return response.json();
}
