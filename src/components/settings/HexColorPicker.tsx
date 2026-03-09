'use client';

import { useRef } from 'react';
import { Label } from '@/components/ui/label';

interface HexColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const PRESETS = [
  '#0F172A', '#2563EB', '#0891B2', '#059669',
  '#16A34A', '#D97706', '#EA580C', '#DC2626',
  '#7C3AED', '#DB2777', '#374151', '#6B7280',
];

export function HexColorPicker({ label, value, onChange }: HexColorPickerProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
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

      {/* Preset swatches + custom picker */}
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
        {/* Custom color picker */}
        <div className="relative" style={{ width: 32, height: 32, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            title="Custom color"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '2px dashed #D0CEC8',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v8M8 12h8"/>
            </svg>
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={normalizedValue}
            onChange={(e) => onChange(e.target.value)}
            tabIndex={-1}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* Hex input row */}
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-lg border border-[#E8E5DE] shrink-0 transition-colors duration-200"
          style={{ backgroundColor: normalizedValue }}
        />
        <div className="flex flex-1 items-center h-9">
          <span className="h-full px-2.5 flex items-center rounded-l-lg border border-r-0 border-[#DEDBD5] bg-[#FAFAF8] text-xs text-[#888] font-medium select-none">
            #
          </span>
          <input
            type="text"
            value={normalizedValue.replace('#', '')}
            onChange={handleHexInput}
            placeholder="000000"
            maxLength={6}
            className="h-full flex-1 min-w-0 px-3 rounded-r-lg border border-[#DEDBD5] bg-white text-sm font-mono text-[#1A1A1A] outline-none transition-colors focus:border-[var(--accent)]"
          />
        </div>
      </div>
    </div>
  );
}
