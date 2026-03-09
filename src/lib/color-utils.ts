// Shared color utilities and preset arrays for the design editor

export function rgbToHex(rgb: string): string {
  if (!rgb) return '#1c1c1e';
  if (rgb.startsWith('#')) return rgb;
  const match = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (!match) return '#1c1c1e';
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function hexToRgb(hex: string): string {
  if (!hex) return 'rgb(28, 28, 30)';
  if (hex.startsWith('rgb')) return hex;
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Returns relative luminance of a hex color (0 = black, 1 = white) */
export function hexLuminance(hex: string): number {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Returns the best icon color (white or black) for a given stamp background hex color */
export function autoIconColor(stampHex: string): string {
  return hexLuminance(stampHex) > 0.4 ? '#000000' : '#ffffff';
}

/** WCAG contrast ratio between two hex colors */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = hexLuminance(hex1);
  const l2 = hexLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface ColorPreset {
  name: string;
  value: string;
}

export const designColors: readonly ColorPreset[] = [
  { name: "Sage", value: "#4A7C59" },
  { name: "Forest", value: "#3D6B4A" },
  { name: "Ocean", value: "#2D5F8A" },
  { name: "Sky", value: "#3D7CAF" },
  { name: "Amber", value: "#C4883D" },
  { name: "Caramel", value: "#A06B2D" },
  { name: "Plum", value: "#8B5A8B" },
  { name: "Berry", value: "#6B3A6B" },
  { name: "Coral", value: "#C75050" },
  { name: "Crimson", value: "#A03D3D" },
  { name: "Charcoal", value: "#2D2D2D" },
  { name: "Black", value: "#1A1A1A" },
  { name: "Gray", value: "#555555" },
  { name: "Silver", value: "#888888" },
  { name: "Linen", value: "#E8E5DE" },
  { name: "White", value: "#FFFFFF" },
];

// Backwards-compatible aliases — all use the same rich palette
export const backgroundColors = designColors;
export const accentColors = designColors;
export const iconColors = designColors;
export const textColors = designColors;
export const emptyStampColors = designColors;
