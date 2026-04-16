import {
  API_BASE_URL,
  getAuthHeaders,
  getAuthHeadersForFormData,
  throwApiError,
} from './client';
import type {
  NotificationTemplate,
  NotificationTemplatesResponse,
  Milestone,
  MilestonesResponse,
  MilestoneCreate,
  MilestoneUpdate,
  MilestoneUpdateResponse,
  Broadcast,
  BroadcastListParams,
  BroadcastStatsResponse,
  PaginatedBroadcasts,
  BroadcastCreate,
  BroadcastUpdate,
  BroadcastSendAgain,
  BroadcastTargetFilter,
  RecipientEstimateResponse,
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

/**
 * Update a notification template. Either `body` or `isEnabled` (or both)
 * may be provided. Body-only updates are plan-gated on the backend; a
 * request that only flips `isEnabled` is allowed on every plan so Starter
 * businesses can opt out of base messages without unlocking custom copy.
 */
export async function updateNotificationTemplate(
  businessId: string,
  trigger: TriggerType,
  payload: { body?: LocalizedBody; isEnabled?: boolean }
): Promise<NotificationTemplate> {
  if (USE_MOCKS) {
    const existing = MOCK_TEMPLATES_RESPONSE.items.find(
      (t) => t.trigger === trigger
    );
    if (!existing) throw new Error(`Unknown trigger: ${trigger}`);
    if (payload.body !== undefined) {
      existing.body = payload.body;
      existing.is_customized = true;
    }
    if (payload.isEnabled !== undefined) {
      existing.is_enabled = payload.isEnabled;
    }
    return existing;
  }

  const requestBody: Record<string, unknown> = {};
  if (payload.body !== undefined) requestBody.body = payload.body;
  if (payload.isEnabled !== undefined) requestBody.is_enabled = payload.isEnabled;

  const response = await fetch(
    `${API_BASE_URL}/notifications/${businessId}/templates/${trigger}`,
    {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(requestBody),
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
// Milestones (stamp-count triggers)
// ─────────────────────────────────────────────────────────────────────────

export async function listMilestones(
  businessId: string,
  programId?: string
): Promise<MilestonesResponse> {
  if (USE_MOCKS) {
    return {
      program_id: 'mock-program',
      tier: 'starter',
      limit: 0,
      items: [],
    };
  }

  const query = programId ? `?program_id=${encodeURIComponent(programId)}` : '';
  const response = await fetch(
    `${API_BASE_URL}/notifications/${businessId}/milestones${query}`,
    { headers: await getAuthHeaders() }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to fetch milestones');
  }

  return response.json();
}

export async function createMilestone(
  businessId: string,
  payload: MilestoneCreate,
  programId?: string
): Promise<Milestone> {
  if (USE_MOCKS) {
    throw new Error('Milestones not available in mock mode');
  }

  const query = programId ? `?program_id=${encodeURIComponent(programId)}` : '';
  const response = await fetch(
    `${API_BASE_URL}/notifications/${businessId}/milestones${query}`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to create milestone');
  }

  return response.json();
}

export async function updateMilestone(
  businessId: string,
  templateId: string,
  payload: MilestoneUpdate,
  programId?: string
): Promise<MilestoneUpdateResponse> {
  if (USE_MOCKS) {
    throw new Error('Milestones not available in mock mode');
  }

  const query = programId ? `?program_id=${encodeURIComponent(programId)}` : '';
  const response = await fetch(
    `${API_BASE_URL}/notifications/${businessId}/milestones/${templateId}${query}`,
    {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to update milestone');
  }

  return response.json();
}

export async function deleteMilestone(
  businessId: string,
  templateId: string,
  programId?: string
): Promise<void> {
  if (USE_MOCKS) return;

  const query = programId ? `?program_id=${encodeURIComponent(programId)}` : '';
  const response = await fetch(
    `${API_BASE_URL}/notifications/${businessId}/milestones/${templateId}${query}`,
    {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to delete milestone');
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
//
// Path contract: /broadcasts/{business_id}[/{broadcast_id}][/send|/estimate]
// Pagination: offset-based (limit, offset). See
// backend/app/api/routes/broadcasts.py for the full surface.
// ─────────────────────────────────────────────────────────────────────────

export async function listBroadcasts(
  businessId: string,
  params: BroadcastListParams = {}
): Promise<PaginatedBroadcasts> {
  if (USE_MOCKS) {
    return { items: MOCK_BROADCASTS, total: 0, limit: 50, offset: 0 };
  }

  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set('limit', params.limit.toString());
  if (params.offset !== undefined) query.set('offset', params.offset.toString());
  if (params.status !== undefined) query.set('status', params.status);
  const qs = query.toString();

  const response = await fetch(
    `${API_BASE_URL}/broadcasts/${businessId}${qs ? `?${qs}` : ''}`,
    { headers: await getAuthHeaders() }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to fetch broadcasts');
  }

  return response.json();
}

export async function getBroadcastStats(
  businessId: string
): Promise<BroadcastStatsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/broadcasts/${businessId}/stats`,
    { headers: await getAuthHeaders() }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to fetch broadcast stats');
  }
  return response.json();
}

export async function getBroadcast(
  businessId: string,
  broadcastId: string
): Promise<Broadcast> {
  if (USE_MOCKS) {
    const b = MOCK_BROADCASTS.find((x) => x.id === broadcastId);
    if (!b) throw new Error('Broadcast not found');
    return b;
  }

  const response = await fetch(
    `${API_BASE_URL}/broadcasts/${businessId}/${broadcastId}`,
    { headers: await getAuthHeaders() }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to fetch broadcast');
  }

  return response.json();
}

export async function createBroadcast(
  businessId: string,
  payload: BroadcastCreate
): Promise<Broadcast> {
  if (USE_MOCKS) {
    throw new Error('Broadcasts not available in mock mode');
  }

  const response = await fetch(`${API_BASE_URL}/broadcasts/${businessId}`, {
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
  businessId: string,
  broadcastId: string,
  payload: BroadcastUpdate
): Promise<Broadcast> {
  if (USE_MOCKS) {
    throw new Error('Broadcasts not available in mock mode');
  }

  const response = await fetch(
    `${API_BASE_URL}/broadcasts/${businessId}/${broadcastId}`,
    {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to update broadcast');
  }

  return response.json();
}

/**
 * Cancel a draft or scheduled broadcast. Backend DELETE flips status to
 * 'cancelled' rather than deleting the row (audit trail).
 */
export async function cancelBroadcast(
  businessId: string,
  broadcastId: string
): Promise<void> {
  if (USE_MOCKS) return;

  const response = await fetch(
    `${API_BASE_URL}/broadcasts/${businessId}/${broadcastId}`,
    {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to cancel broadcast');
  }
}

/** Fire a draft right now. Backend flips to 'sending' + enqueues the worker. */
export async function sendBroadcast(
  businessId: string,
  broadcastId: string
): Promise<Broadcast> {
  if (USE_MOCKS) {
    throw new Error('Broadcasts not available in mock mode');
  }

  const response = await fetch(
    `${API_BASE_URL}/broadcasts/${businessId}/${broadcastId}/send`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to send broadcast');
  }

  return response.json();
}

/**
 * Create a new broadcast reusing the content and audience of an existing
 * one. Without `scheduled_at` the new broadcast fires immediately. With
 * `scheduled_at` it's persisted as `scheduled` for the cron poller to
 * pick up. Counters reset to 0 — it's a fresh delivery attempt.
 */
export async function sendBroadcastAgain(
  businessId: string,
  broadcastId: string,
  payload: BroadcastSendAgain
): Promise<Broadcast> {
  if (USE_MOCKS) {
    throw new Error('Broadcasts not available in mock mode');
  }

  const response = await fetch(
    `${API_BASE_URL}/broadcasts/${businessId}/${broadcastId}/send-again`,
    {
      method: 'POST',
      headers: {
        ...(await getAuthHeaders()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload ?? {}),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to re-send broadcast');
  }

  return response.json();
}

export async function estimateRecipients(
  businessId: string,
  filter: BroadcastTargetFilter
): Promise<RecipientEstimateResponse> {
  if (USE_MOCKS) {
    return { target_filter: filter, total: Math.floor(Math.random() * 500) + 50 };
  }

  const response = await fetch(
    `${API_BASE_URL}/broadcasts/${businessId}/estimate`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ target_filter: filter }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to estimate recipients');
  }

  return response.json();
}
