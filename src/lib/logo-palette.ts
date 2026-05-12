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
  vibrant: string | null;
  darkVibrant: string | null;
  lightVibrant: string | null;
  muted: string | null;
  darkMuted: string | null;
  lightMuted: string | null;
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
      const result = await Vibrant.from(url).getPalette();
      const palette: LogoPalette = {
        vibrant: result.Vibrant?.hex ?? null,
        darkVibrant: result.DarkVibrant?.hex ?? null,
        lightVibrant: result.LightVibrant?.hex ?? null,
        muted: result.Muted?.hex ?? null,
        darkMuted: result.DarkMuted?.hex ?? null,
        lightMuted: result.LightMuted?.hex ?? null,
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
 * Returns the up to 5 most distinctive swatches as a sorted list, useful for
 * showing the user a "from your logo" row of preset swatches. Filters out
 * near-duplicates so the row reads as 5 visually distinct options rather than
 * subtle variations of the same hue.
 */
export function paletteToSwatches(palette: LogoPalette | null): string[] {
  if (!palette) return [];
  const candidates = [
    palette.vibrant,
    palette.darkVibrant,
    palette.lightVibrant,
    palette.muted,
    palette.darkMuted,
    palette.lightMuted,
  ].filter((c): c is string => Boolean(c));
  const out: string[] = [];
  for (const hex of candidates) {
    if (out.some((existing) => hexDistance(existing, hex) < 24)) continue;
    out.push(hex);
    if (out.length >= 5) break;
  }
  return out;
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
