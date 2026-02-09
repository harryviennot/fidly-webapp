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

export const backgroundColors: ColorPreset[] = [
  { name: "Dark", value: "#1c1c1e" },
  { name: "Black", value: "#000000" },
  { name: "Navy", value: "#1a237e" },
  { name: "Wine", value: "#4a1c40" },
  { name: "Slate", value: "#37474f" },
  { name: "Cream", value: "#f5f0e8" },
  { name: "White", value: "#ffffff" },
];

export const accentColors: ColorPreset[] = [
  { name: "Orange", value: "#f97316" },
  { name: "Coral", value: "#e57373" },
  { name: "Red", value: "#f44336" },
  { name: "Teal", value: "#26a69a" },
  { name: "Purple", value: "#7e57c2" },
  { name: "Blue", value: "#42a5f5" },
  { name: "Green", value: "#4caf50" },
];

export const iconColors: ColorPreset[] = [
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#000000" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Cyan", value: "#06b6d4" },
];

export const textColors: ColorPreset[] = [
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#000000" },
  { name: "Dark Gray", value: "#374151" },
  { name: "Light Gray", value: "#d1d5db" },
  { name: "Cream", value: "#f5f5f0" },
  { name: "Slate", value: "#64748b" },
  { name: "Navy", value: "#1e3a5f" },
];

export const emptyStampColors: ColorPreset[] = [
  { name: "White", value: "#ffffff" },
  { name: "Light Gray", value: "#e5e7eb" },
  { name: "Gray", value: "#9ca3af" },
  { name: "Dark", value: "#374151" },
  { name: "Soft Pink", value: "#fce4ec" },
  { name: "Soft Blue", value: "#e3f2fd" },
  { name: "Transparent", value: "#00000000" },
];
