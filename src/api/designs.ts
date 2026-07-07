import { API_BASE_URL, getAuthHeaders, getAuthHeadersForFormData, throwApiError } from './client';
import type {
  CardDesign,
  CardDesignCreate,
  CardDesignUpdate,
  ProcessedIconAsset,
  UploadResponse,
} from '@/types';

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

/** Options for design-creating calls that may need the conversion carve-out. */
export interface CreateDesignOptions {
  /**
   * `'conversion'` grants one design slot over the tier's limit (the convert
   * wizard's target-type draft). Reconciled at conversion commit, which
   * deletes the old design when the saved limit is exceeded.
   */
  purpose?: 'conversion';
}

function purposeQuery(opts?: CreateDesignOptions): string {
  return opts?.purpose ? `?purpose=${opts.purpose}` : '';
}

export async function createDesign(
  businessId: string,
  data: CardDesignCreate,
  opts?: CreateDesignOptions
): Promise<CardDesign> {
  const response = await fetch(
    `${API_BASE_URL}/designs/${businessId}${purposeQuery(opts)}`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to create design');
  }

  return response.json();
}

export interface UpdateDesignOptions {
  /**
   * When `false`, the backend persists the update but does NOT queue a strip
   * regeneration even if strip-affecting fields changed. The onboarding
   * wizard passes `false` on every per-step save so the design chapter only
   * triggers one explicit regeneration (`regenerateStripsForDesign`) when
   * the user leaves the chapter. Defaults to `true` everywhere else so
   * dashboard edits behave as before.
   */
  regenerateStrips?: boolean;
}

export async function updateDesign(
  businessId: string,
  designId: string,
  data: CardDesignUpdate,
  options: UpdateDesignOptions = {}
): Promise<CardDesign> {
  const params = new URLSearchParams();
  if (options.regenerateStrips === false) {
    params.set('regenerate_strips', 'false');
  }
  const query = params.toString();
  const url = `${API_BASE_URL}/designs/${businessId}/${designId}${query ? `?${query}` : ''}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to update design');
  }

  return response.json();
}

/**
 * Trigger a single strip regeneration on the design. No-ops server-side when
 * a regen is already in flight. The onboarding wizard fires this once when
 * the user leaves the design chapter so the many per-step saves coalesce
 * into one render.
 */
export async function regenerateStripsForDesign(
  businessId: string,
  designId: string
): Promise<CardDesign> {
  const response = await fetch(
    `${API_BASE_URL}/designs/${businessId}/${designId}/regenerate-strips`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to regenerate strips');
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
    throwApiError(error, 'Failed to delete design');
  }
}

export async function activateDesign(businessId: string, designId: string): Promise<CardDesign> {
  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}/activate`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to activate design');
  }

  return response.json();
}

export async function duplicateDesign(
  businessId: string,
  designId: string,
  opts?: CreateDesignOptions
): Promise<CardDesign> {
  // Server-side deep clone: copies the full row (card_type + points config +
  // translations + custom-stamp config) and physically copies the Storage
  // assets (logo, strip background, stamp icons) into the new design's folder.
  const response = await fetch(
    `${API_BASE_URL}/designs/${businessId}/${designId}/duplicate${purposeQuery(opts)}`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to duplicate design');
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
    throwApiError(error, 'Failed to upload logo');
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
    throwApiError(error, 'Failed to upload stamp');
  }

  return response.json();
}

/**
 * Upload + server-process a custom stamp icon. The backend optionally
 * removes the background, trims, normalizes, and derives the greyscale and
 * outline empty-state variants; the returned URLs are final and the
 * preview displays them directly. Slot-agnostic: the caller decides where
 * the asset goes inside custom_stamp_config and persists via updateDesign.
 *
 * Processing (rembg especially) takes a few seconds; the request is
 * capped at 30s client-side.
 */
export async function uploadStampIcon(
  businessId: string,
  designId: string,
  file: File,
  removeBg: boolean
): Promise<ProcessedIconAsset> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('remove_bg', String(removeBg));

  const response = await fetch(
    `${API_BASE_URL}/designs/${businessId}/${designId}/upload/stamp-icon`,
    {
      method: 'POST',
      headers: await getAuthHeadersForFormData(),
      body: formData,
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to upload stamp icon');
  }

  return response.json();
}

/**
 * Re-process an already-uploaded icon's stored original with a different
 * background-removal setting (the editor toggle). Mints a new asset.
 */
export async function reprocessStampIcon(
  businessId: string,
  designId: string,
  sourceAssetId: string,
  removeBg: boolean
): Promise<ProcessedIconAsset> {
  const formData = new FormData();
  formData.append('source_asset_id', sourceAssetId);
  formData.append('remove_bg', String(removeBg));

  const response = await fetch(
    `${API_BASE_URL}/designs/${businessId}/${designId}/upload/stamp-icon`,
    {
      method: 'POST',
      headers: await getAuthHeadersForFormData(),
      body: formData,
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to process stamp icon');
  }

  return response.json();
}

/** Best-effort eager cleanup when an icon is removed before save. */
export async function deleteStampIcon(
  businessId: string,
  designId: string,
  assetId: string
): Promise<void> {
  await fetch(
    `${API_BASE_URL}/designs/${businessId}/${designId}/upload/stamp-icon/${assetId}`,
    {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    }
  ).catch(() => undefined);
}

export async function uploadStripBackground(
  businessId: string,
  designId: string,
  file: File
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/designs/${businessId}/${designId}/upload/strip-background`, {
    method: 'POST',
    headers: await getAuthHeadersForFormData(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throwApiError(error, 'Failed to upload strip background');
  }

  return response.json();
}
