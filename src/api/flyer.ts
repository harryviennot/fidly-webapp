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

/** Generate a flyer PDF and open it in a new tab (the browser's PDF viewer,
 *  from which the user can print or save). The endpoint is authenticated, so
 *  we fetch the blob ourselves rather than point an `<a target="_blank">` at
 *  it. The blank tab is opened synchronously on the user gesture to dodge
 *  popup blockers, then pointed at the blob once it's ready; if the popup was
 *  blocked we fall back to a download. */
export async function openFlyerPdf(
  businessId: string,
  p: FlyerParams,
  fallbackFileName = 'flyer.pdf'
): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const res = await fetch(
      `${API_BASE_URL}/businesses/${businessId}/flyer.pdf?${buildQuery(p)}`,
      { headers: await getAuthHeaders() }
    );
    if (!res.ok) throw new Error('Failed to generate flyer');
    const objectUrl = URL.createObjectURL(await res.blob());
    if (tab) {
      tab.location.href = objectUrl;
    } else {
      // Popup blocked — degrade gracefully to a download.
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fallbackFileName;
      link.click();
    }
    // Revoke late so the new tab has time to load the document.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (err) {
    tab?.close();
    throw err;
  }
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
