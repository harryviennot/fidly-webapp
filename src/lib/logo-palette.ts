/**
 * Logo palette extraction. Pulls 6 categorized swatches out of a logo URL
 * using node-vibrant, caches the result module-locally so repeated reads
 * (e.g. re-rendering the design step) are free, and gracefully no-ops when
 * the image is monochrome or CORS-blocked.
 *
 * The categories map naturally onto card-design roles:
 *  - Vibrant       → the brand accent
 *  - DarkVibrant   → text on light backgrounds / dark accent
 *  - LightVibrant  → accent on dark backgrounds
 *  - Muted         → balanced backgrounds
 *  - DarkMuted     → dark backgrounds
 *  - LightMuted    → light, off-white backgrounds
 *
 * Browser-only — uses the canvas API. The wizard's design step is client-side
 * so this is fine, but never import this module from a server component.
 */

import { Vibrant } from 'node-vibrant/browser';

export interface LogoPalette {
  /** Vibrant's named swatches — used for the theme-variant generator's role
   *  assignment. May be null when a category isn't represented in the logo. */
  vibrant: string | null;
  darkVibrant: string | null;
  lightVibrant: string | null;
  muted: string | null;
  darkMuted: string | null;
  lightMuted: string | null;
  /** Top colors by actual pixel count, quantized so near-duplicates collapse.
   *  This is what surfaces in the "From your logo" picker row — Vibrant
   *  filters out white / neutral backgrounds, which surprised users who
   *  expected to see the real top-frequency colors. */
  dominantColors: string[];
}

// Cache stores `null` for "extraction attempted, no usable palette" so the
// hook can distinguish "still loading" from "we tried, gave up". Use
// `cache.has(url)` to check completion, not `cache.get(url)`.
const cache = new Map<string, LogoPalette | null>();
const inflight = new Map<string, Promise<LogoPalette | null>>();

export function getCachedPalette(url: string | undefined | null): LogoPalette | null {
  if (!url) return null;
  return cache.get(url) ?? null;
}

export function hasCachedPalette(url: string | undefined | null): boolean {
  if (!url) return false;
  return cache.has(url);
}

export async function extractLogoPalette(
  url: string | undefined | null
): Promise<LogoPalette | null> {
  if (!url || url.startsWith('blob:') === false && !/^https?:|^\/\//.test(url)) {
    // Accept blob: URLs (cropper output) and http(s) URLs only.
    if (!url?.startsWith('blob:')) return null;
  }
  if (!url) return null;
  const cached = cache.get(url);
  if (cached) return cached;
  const pending = inflight.get(url);
  if (pending) return pending;

  const run = (async () => {
    try {
      // Run Vibrant (for categorized swatches → theme variants) and the raw
      // histogram (for honest top-N by pixel count → "From your logo") in
      // parallel. Both load the image themselves; the browser cache shares
      // bytes between them.
      const [vibrantResult, dominantColors] = await Promise.all([
        Vibrant.from(url).getPalette(),
        // Cap at 4 so the ColorPicker can split logos symmetrically across
        // the two rows on mobile (2 per row, each row with its own separator).
        extractDominantColors(url, 4),
      ]);
      const palette: LogoPalette = {
        vibrant: vibrantResult.Vibrant?.hex ?? null,
        darkVibrant: vibrantResult.DarkVibrant?.hex ?? null,
        lightVibrant: vibrantResult.LightVibrant?.hex ?? null,
        muted: vibrantResult.Muted?.hex ?? null,
        darkMuted: vibrantResult.DarkMuted?.hex ?? null,
        lightMuted: vibrantResult.LightMuted?.hex ?? null,
        dominantColors,
      };
      cache.set(url, palette);
      return palette;
    } catch {
      // CORS, fully transparent PNGs, or malformed images all land here.
      // Cache the null so the hook stops showing "loading" forever.
      cache.set(url, null);
      return null;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, run);
  return run;
}

/**
 * Returns the colors to surface in the "From your logo" preset row. These
 * are the actual top-frequency pixels from the image, not Vibrant's
 * categorized swatches — that's what users expect when they look at a logo
 * and pick colors from it.
 */
export function paletteToSwatches(palette: LogoPalette | null): string[] {
  return palette?.dominantColors ?? [];
}

function hexDistance(a: string, b: string): number {
  const pa = parseHex(a);
  const pb = parseHex(b);
  return Math.sqrt((pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2 + (pa[2] - pb[2]) ** 2);
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/**
 * Honest top-N color extraction by raw pixel frequency. Quantizes each
 * channel to 5 bits (32 levels per channel → 32768 buckets) so near-
 * duplicates collapse together, then sorts by bucket population.
 *
 * Why custom over Vibrant for this: Vibrant explicitly filters out
 * white/near-white and black/near-black as "boring" backgrounds, and
 * biases toward saturated hues. That's the right call for picking an
 * accent color, but the wrong call for "what colors are actually in
 * this logo?" — which is what users expect from a "From your logo" row.
 *
 * Returns hex strings (uppercase, no transparency).
 */
async function extractDominantColors(url: string, count: number): Promise<string[]> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('image load failed'));
    el.src = url;
  });

  const maxSize = 120;
  const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight, 1);
  const w = Math.max(1, Math.floor(img.naturalWidth * scale));
  const h = Math.max(1, Math.floor(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  // Bucket: 5 bits per channel → fits in a 15-bit key for fast Map lookups.
  const counts = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue; // skip transparent pixels
    const r = data[i] >> 3;
    const g = data[i + 1] >> 3;
    const b = data[i + 2] >> 3;
    const key = (r << 10) | (g << 5) | b;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const out: string[] = [];
  for (const [key] of sorted) {
    // Re-expand the quantized bucket to a representative 8-bit color. Bias
    // up by 4 (half a bucket) so we don't always land at the bucket's bottom.
    const r = (((key >> 10) & 0x1f) << 3) | 0x04;
    const g = (((key >> 5) & 0x1f) << 3) | 0x04;
    const b = ((key & 0x1f) << 3) | 0x04;
    const hex = '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase();
    // Reject near-duplicates of colors we've already accepted so the row
    // is visibly distinct, not five shades of the same hue.
    if (out.some((existing) => hexDistance(existing, hex) < 32)) continue;
    out.push(hex);
    if (out.length >= count) break;
  }
  return out;
}
