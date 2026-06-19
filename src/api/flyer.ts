import { API_BASE_URL, getAuthHeaders } from './client';

export type FlyerLocale = 'en' | 'fr' | 'es';

export interface FlyerParams {
  locale: FlyerLocale;
  /** Preview / single-flyer download for one location. Omit for a
   *  business-level flyer (no location). */
  locationId?: string | null;
  showDecor?: boolean;
  showBadges?: boolean;
}

function buildQuery(p: FlyerParams, includeLocation = true): string {
  const u = new URLSearchParams();
  u.set('locale', p.locale);
  if (includeLocation && p.locationId) u.set('location_id', p.locationId);
  if (p.showDecor === false) u.set('show_decor', 'false');
  if (p.showBadges === false) u.set('show_badges', 'false');
  return u.toString();
}

/** Fetch the flyer rendered as HTML for the on-screen preview iframe.
 *  Authenticated (Bearer), so a plain <iframe src> can't be used. */
export async function fetchFlyerPreviewHtml(
  businessId: string,
  p: FlyerParams,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(
    `${API_BASE_URL}/businesses/${businessId}/flyer/preview?${buildQuery(p)}`,
    { headers: await getAuthHeaders(), signal }
  );
  if (!res.ok) throw new Error('Failed to load flyer preview');
  return res.text();
}

/** Fetch a PDF (authenticated) and trigger a one-tap browser download.
 *  The filename is supplied by the caller so we don't depend on the
 *  Content-Disposition header being CORS-exposed. */
async function downloadPdf(url: string, fileName: string): Promise<void> {
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to generate flyer');
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

/** Download one flyer (business-level, or a single location). */
export async function downloadFlyerPdf(
  businessId: string,
  p: FlyerParams,
  fileName: string
): Promise<void> {
  return downloadPdf(
    `${API_BASE_URL}/businesses/${businessId}/flyer.pdf?${buildQuery(p)}`,
    fileName
  );
}

/** Download every active location's flyer as one multi-page PDF. */
export async function downloadFlyersPdf(
  businessId: string,
  p: Omit<FlyerParams, 'locationId'>,
  fileName: string
): Promise<void> {
  return downloadPdf(
    `${API_BASE_URL}/businesses/${businessId}/flyers.pdf?${buildQuery(p, false)}`,
    fileName
  );
}
