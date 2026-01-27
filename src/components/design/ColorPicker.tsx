'use client';

import { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const PRESETS = [
  'rgb(139, 90, 43)',    // Coffee brown
  'rgb(30, 30, 30)',     // Dark
  'rgb(0, 122, 255)',    // Blue
  'rgb(52, 199, 89)',    // Green
  'rgb(255, 59, 48)',    // Red
  'rgb(255, 149, 0)',    // Orange
  'rgb(175, 82, 222)',   // Purple
  'rgb(255, 255, 255)',  // White
];

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return '#8B5A2B';
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 'rgb(139, 90, 43)';
  return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
}

export default function ColorPicker({ label, value, onChange }: ColorPickerProps) {
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

  return (
    <div className="color-picker-wrapper" ref={pickerRef}>
      <label className="color-picker-label">{label}</label>
      <div className="color-picker-controls">
        <button
          type="button"
          className="color-swatch"
          style={{ backgroundColor: value }}
          onClick={() => setShowPicker(!showPicker)}
          aria-label={`Select ${label}`}
        />
        <input
          type="text"
          className="color-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="rgb(r, g, b)"
        />
      </div>

      {showPicker && (
        <div className="color-picker-dropdown">
          <div className="color-presets">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`preset-swatch ${value === preset ? 'active' : ''}`}
                style={{ backgroundColor: preset }}
                onClick={() => {
                  onChange(preset);
                  setShowPicker(false);
                }}
              />
            ))}
          </div>
          <div className="color-custom">
            <input
              type="color"
              value={rgbToHex(value)}
              onChange={(e) => onChange(hexToRgb(e.target.value))}
            />
            <span>Custom color</span>
          </div>
        </div>
      )}
    </div>
  );
}
