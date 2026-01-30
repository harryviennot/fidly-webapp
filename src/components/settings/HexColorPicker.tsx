'use client';

import { useState, useRef, useEffect } from 'react';
import { Label } from '@/components/ui/label';

interface HexColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const PRESETS = [
  '#8B5A2B',  // Coffee brown
  '#1E1E1E',  // Dark
  '#007AFF',  // Blue
  '#34C759',  // Green
  '#FF3B30',  // Red
  '#FF9500',  // Orange
  '#AF52DE',  // Purple
  '#FFFFFF',  // White
];

export function HexColorPicker({ label, value, onChange }: HexColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure value is valid hex
  const normalizedValue = value?.startsWith('#') ? value : `#${value}`;

  return (
    <div className="space-y-2 relative" ref={pickerRef}>
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="w-10 h-10 rounded-lg border border-[var(--border)] shadow-sm cursor-pointer transition-transform hover:scale-105"
          style={{ backgroundColor: normalizedValue }}
          onClick={() => setShowPicker(!showPicker)}
          aria-label={`Select ${label}`}
        />
        <input
          type="text"
          className="flex-1 h-10 px-3 rounded-lg border border-[var(--border)] bg-white/50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
          value={normalizedValue}
          onChange={(e) => {
            const val = e.target.value;
            if (val.match(/^#?[0-9A-Fa-f]{0,6}$/)) {
              onChange(val.startsWith('#') ? val : `#${val}`);
            }
          }}
          placeholder="#000000"
        />
      </div>

      {showPicker && (
        <div className="absolute z-50 mt-2 p-3 bg-white rounded-xl border border-[var(--border)] shadow-lg">
          <div className="grid grid-cols-4 gap-2 mb-3">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                  normalizedValue.toLowerCase() === preset.toLowerCase()
                    ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: preset }}
                onClick={() => {
                  onChange(preset);
                  setShowPicker(false);
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
            <input
              type="color"
              value={normalizedValue}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <span className="text-sm text-[var(--muted-foreground)]">Custom color</span>
          </div>
        </div>
      )}
    </div>
  );
}
