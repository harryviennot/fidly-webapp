'use client';

import { Label } from '@/components/ui/label';

interface HexColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const PRESETS = [
  '#4A7C59', '#3D6B4A', '#2D5F8A', '#3D7CAF',
  '#C4883D', '#A06B2D', '#8B5A8B', '#6B3A6B',
  '#C75050', '#A03D3D', '#2D2D2D', '#555555',
];

export function HexColorPicker({ label, value, onChange }: HexColorPickerProps) {
  const normalizedValue = value?.startsWith('#') ? value : `#${value}`;

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace('#', '').slice(0, 6);
    if (/^[0-9A-Fa-f]{0,6}$/.test(raw) && raw.length === 6) {
      onChange(`#${raw}`);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold text-[#555]">{label}</Label>

      {/* Preset swatches */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const isSelected = normalizedValue.toLowerCase() === preset.toLowerCase();
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              aria-label={preset}
              style={{
                backgroundColor: preset,
                width: 32,
                height: 32,
                borderRadius: 8,
                border: isSelected ? '3px solid #fff' : '2px solid transparent',
                boxShadow: isSelected
                  ? `0 0 0 2px ${preset}, 0 2px 8px ${preset}40`
                  : 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(.16,1,.3,1)',
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>

      {/* Hex input row */}
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-lg border border-[#E8E5DE] shrink-0 transition-colors duration-200"
          style={{ backgroundColor: normalizedValue }}
        />
        <div className="flex flex-1 items-center">
          <span className="px-2.5 py-2 rounded-l-lg border border-r-0 border-[#DEDBD5] bg-[#FAFAF8] text-xs text-[#888] font-medium select-none">
            #
          </span>
          <input
            type="text"
            value={normalizedValue.replace('#', '')}
            onChange={handleHexInput}
            placeholder="000000"
            maxLength={6}
            className="flex-1 min-w-0 py-2 px-3 rounded-r-lg border border-[#DEDBD5] bg-white text-sm font-mono text-[#1A1A1A] outline-none transition-colors focus:border-[var(--accent)]"
          />
        </div>
      </div>
    </div>
  );
}
