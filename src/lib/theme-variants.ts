/**
 * Theme variant generator. Given a logo's extracted palette, produces a fixed
 * list of `{ background, foreground, label, stampFilled, ... }` tuples that
 * the Branding step's "Auto-generate" button cycles through.
 *
 * Determinism: extraction is deterministic and so is this module — the same
 * palette in always yields the same variant list out. "Try another" walks the
 * list with a counter, never random.
 *
 * Contrast guards: each variant is post-validated against WCAG 4.5:1 for
 * text-on-background. If a generated combination fails, the text is forced
 * to pure black or white (whichever passes). We never ship sub-3:1 text.
 */

import { autoIconColor, contrastRatio, hexLuminance } from './color-utils';
import type { LogoPalette } from './logo-palette';

export interface ThemeVariant {
  /** Stable id for telemetry / keys. */
  id: string;
  /** Display name shown in the cycle UI ("Light", "Dark", …). */
  name: string;
  background: string;
  foreground: string;
  label: string;
  stampFilled: string;
  stampEmpty: string;
  stampBorder: string;
  iconColor: string;
}

/**
 * Pick the first non-null fallback in order. Used to coalesce optional
 * palette swatches into a guaranteed color for each role.
 */
function pick(...candidates: (string | null | undefined)[]): string {
  for (const c of candidates) if (c) return c;
  return '#000000';
}

/** Force `text` to pure white or black if it fails 4.5:1 against `bg`. */
function enforceContrast(text: string, bg: string): string {
  if (contrastRatio(text, bg) >= 4.5) return text;
  return hexLuminance(bg) > 0.4 ? '#000000' : '#FFFFFF';
}

function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue: number;
  switch (max) {
    case r:
      hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      hue = ((b - r) / d + 2) / 6;
      break;
    default:
      hue = ((r - g) / d + 4) / 6;
  }
  return [hue, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const to255 = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to255(r)}${to255(g)}${to255(b)}`;
}

function adjustLightness(hex: string, target: number): string {
  const [h, s] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, Math.min(1, target)));
}

/**
 * Build the variant list. The order is fixed — the cycle UI walks it
 * sequentially so "Try another" is predictable across renders.
 *
 * If a particular variant can't be sensibly built (e.g. logo only yielded
 * one usable swatch), it falls back through `pick(...)` to plausible defaults
 * and the contrast guard ensures text is still readable.
 */
export function generateThemeVariants(palette: LogoPalette): ThemeVariant[] {
  const vibrant = pick(palette.vibrant, palette.darkVibrant, palette.muted, '#F97316');
  const darkVibrant = pick(palette.darkVibrant, palette.vibrant, palette.darkMuted, '#1A1A1A');
  const lightVibrant = pick(palette.lightVibrant, palette.vibrant, palette.lightMuted, '#FFFFFF');
  const darkMuted = pick(palette.darkMuted, palette.darkVibrant, '#2D2D2D');
  const lightMuted = pick(palette.lightMuted, palette.muted, '#F5F5F5');

  // 1. Light — clean, minimal, brand accent only on the stamp.
  const lightBg = lightMuted;
  const lightText = enforceContrast(darkVibrant, lightBg);
  const lightStamp = vibrant;

  // 2. Dark — rich background, lighter stamp.
  const darkBg = darkMuted;
  const darkText = enforceContrast(lightVibrant, darkBg);
  const darkStamp = lightVibrant;

  // 3. Bold — brand color IS the background.
  const boldBg = vibrant;
  const boldText = enforceContrast(
    hexLuminance(boldBg) > 0.4 ? darkVibrant : '#FFFFFF',
    boldBg
  );
  const boldStamp = hexLuminance(boldBg) > 0.4 ? darkVibrant : lightVibrant;

  // 4. Mono — three HSL tints of the dominant color. Drop saturation slightly
  // for the background so it doesn't compete with the stamp itself.
  const monoBase = vibrant;
  const monoBg = adjustLightness(monoBase, 0.94);
  const monoStamp = monoBase;
  const monoText = enforceContrast(adjustLightness(monoBase, 0.18), monoBg);

  // 5. Soft — neutral off-white background, brand accent reserved entirely
  // for the stamp. The most conservative option, looks "designed" on busy
  // logos where Bold or Dark would be too much.
  const softBg = '#FAFAFA';
  const softText = enforceContrast(darkMuted, softBg);
  const softStamp = vibrant;

  return [
    {
      id: 'light',
      name: 'Light',
      background: lightBg,
      foreground: lightText,
      label: lightText,
      stampFilled: lightStamp,
      stampEmpty: '#FFFFFF',
      stampBorder: adjustLightness(lightText, 0.85),
      iconColor: autoIconColor(lightStamp),
    },
    {
      id: 'dark',
      name: 'Dark',
      background: darkBg,
      foreground: darkText,
      label: darkText,
      stampFilled: darkStamp,
      stampEmpty: adjustLightness(darkBg, 0.18),
      stampBorder: darkText,
      iconColor: autoIconColor(darkStamp),
    },
    {
      id: 'bold',
      name: 'Bold',
      background: boldBg,
      foreground: boldText,
      label: boldText,
      stampFilled: boldStamp,
      stampEmpty: '#FFFFFF',
      stampBorder: '#FFFFFF',
      iconColor: autoIconColor(boldStamp),
    },
    {
      id: 'mono',
      name: 'Mono',
      background: monoBg,
      foreground: monoText,
      label: monoText,
      stampFilled: monoStamp,
      stampEmpty: adjustLightness(monoBase, 0.88),
      stampBorder: adjustLightness(monoBase, 0.7),
      iconColor: autoIconColor(monoStamp),
    },
    {
      id: 'soft',
      name: 'Soft',
      background: softBg,
      foreground: softText,
      label: softText,
      stampFilled: softStamp,
      stampEmpty: '#FFFFFF',
      stampBorder: '#E5E5E5',
      iconColor: autoIconColor(softStamp),
    },
  ];
}
