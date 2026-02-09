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
];

export const emptyStampColors: ColorPreset[] = [
  { name: "White", value: "#ffffff" },
  { name: "Light Gray", value: "#e5e7eb" },
  { name: "Gray", value: "#9ca3af" },
  { name: "Dark", value: "#374151" },
  { name: "Transparent", value: "#00000000" },
];
