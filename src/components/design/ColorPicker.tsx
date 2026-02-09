'use client';

import { Palette } from '@phosphor-icons/react';
import { LabelWithTooltip } from './FieldTooltip';
import type { ColorPreset } from '@/lib/color-utils';

interface ColorPickerProps {
  label: string;
  tooltip: string;
  colors: ColorPreset[];
  value: string; // hex
  onChange: (hex: string) => void;
}

export function ColorPicker({ label, tooltip, colors, value, onChange }: ColorPickerProps) {
  const isCustom = !colors.some(c => c.value.toLowerCase() === value.toLowerCase());

  return (
    <div className="space-y-2">
      <LabelWithTooltip tooltip={tooltip}>{label}</LabelWithTooltip>
      <div className="grid grid-cols-8 gap-2">
        {colors.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onChange(color.value)}
            className={`
              w-10 h-10 rounded-lg transition-all duration-200
              hover:scale-110 focus:outline-none
              ${value.toLowerCase() === color.value.toLowerCase()
                ? 'ring-2 ring-primary ring-offset-2'
                : 'ring-1 ring-black/10'
              }
            `}
            style={{ backgroundColor: color.value === '#00000000' ? 'transparent' : color.value }}
            title={color.name}
          />
        ))}
        <div
          className={`w-10 h-10 rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-center bg-white relative ${
            isCustom ? 'ring-2 ring-primary ring-offset-2' : 'ring-1 ring-black/20'
          }`}
          title="Custom color"
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          />
          <Palette className="w-4 h-4 text-muted-foreground pointer-events-none" weight="bold" />
        </div>
      </div>
    </div>
  );
}
