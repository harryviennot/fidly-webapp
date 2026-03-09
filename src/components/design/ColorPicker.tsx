'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus } from '@phosphor-icons/react';
import { LabelWithTooltip } from './FieldTooltip';
import type { ColorPreset } from '@/lib/color-utils';

interface ColorPickerProps {
  label: string;
  tooltip: string;
  colors: readonly ColorPreset[];
  value: string; // hex
  onChange: (hex: string) => void;
  annotation?: string;
  customColors?: string[];
  onCustomColor?: (hex: string) => void;
}

const isValidHex = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);

function Swatch({ hex, isSelected, onClick, title }: { hex: string; isSelected: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-8 h-8 rounded-md transition-all duration-200 hover:scale-110 focus:outline-none flex-shrink-0"
      style={{
        backgroundColor: hex === '#00000000' ? 'transparent' : hex,
        border: isSelected ? '2.5px solid #fff' : '1.5px solid transparent',
        boxShadow: isSelected
          ? `0 0 0 2px ${hex}, 0 2px 6px ${hex}40`
          : `inset 0 0 0 1px rgba(0,0,0,${hex === '#ffffff' || hex === '#FFFFFF' ? '0.12' : '0.08'})`,
        transform: isSelected ? 'scale(1.12)' : 'scale(1)',
      }}
      title={title}
    />
  );
}

export function ColorPicker({ label, tooltip, colors, value, onChange, annotation, customColors = [], onCustomColor }: ColorPickerProps) {
  const [customInput, setCustomInput] = useState('');
  const colorInputRef = useRef<HTMLInputElement>(null);
  const onCustomColorRef = useRef(onCustomColor);
  useEffect(() => {
    onCustomColorRef.current = onCustomColor;
  }, [onCustomColor]);

  // Attach native 'change' event (fires only on commit, unlike React's onChange)
  useEffect(() => {
    const input = colorInputRef.current;
    if (!input) return;
    const handleNativeChange = (e: Event) => {
      const hex = (e.target as HTMLInputElement).value;
      onCustomColorRef.current?.(hex);
    };
    input.addEventListener('change', handleNativeChange);
    return () => input.removeEventListener('change', handleNativeChange);
  }, []);

  const displayHex = customInput || value.replace('#', '');

  // Deduplicate custom colors against presets
  const presetValues = new Set(colors.map((c) => c.value.toLowerCase()));
  const uniqueCustom = customColors.filter((c) => !presetValues.has(c.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <LabelWithTooltip tooltip={tooltip}>{label}</LabelWithTooltip>
        {annotation && (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{annotation}</span>
        )}
      </div>

      {/* Preset swatches + custom colors + picker button */}
      <div className="flex gap-2 flex-wrap">
        {colors.map((color) => (
          <Swatch
            key={color.value}
            hex={color.value}
            isSelected={value.toLowerCase() === color.value.toLowerCase()}
            onClick={() => { onChange(color.value); setCustomInput(''); }}
            title={color.name}
          />
        ))}
        {/* User-picked custom colors */}
        {uniqueCustom.map((hex) => (
          <Swatch
            key={hex}
            hex={hex}
            isSelected={value.toLowerCase() === hex.toLowerCase()}
            onClick={() => { onChange(hex); setCustomInput(''); }}
            title={hex}
          />
        ))}
        {/* Custom color picker button — hidden input triggered via ref */}
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          title="Custom color"
          className="w-8 h-8 rounded-md border-2 border-dashed border-border flex items-center justify-center hover:border-muted-foreground transition-colors cursor-pointer bg-transparent flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />
        </button>
        <input
          ref={colorInputRef}
          type="color"
          value={value}
          onChange={(e) => {
            // React fires onChange on every drag — just update live preview
            onChange(e.target.value);
            setCustomInput('');
          }}
          tabIndex={-1}
          className="sr-only"
        />
      </div>

      {/* Color swatch + hex input */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-md flex-shrink-0 transition-colors duration-200"
          style={{
            backgroundColor: value,
            border: `1px solid ${value.toLowerCase() === '#ffffff' ? '#DDD' : 'rgba(0,0,0,0.08)'}`,
          }}
        />
        <div className="flex flex-1 min-w-0">
          <span className="px-2 py-2 rounded-l-md border border-r-0 border-border bg-muted/50 text-xs text-muted-foreground select-none">#</span>
          <input
            type="text"
            value={displayHex}
            onChange={(e) => {
              const v = e.target.value.replace('#', '').slice(0, 6);
              setCustomInput(v);
              if (isValidHex('#' + v)) onChange('#' + v);
            }}
            onBlur={() => {
              if (customInput && isValidHex('#' + customInput)) {
                onCustomColor?.('#' + customInput);
              }
              setCustomInput('');
            }}
            placeholder={value.replace('#', '')}
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-r-md border border-border bg-white text-xs text-foreground font-mono tracking-wider outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
