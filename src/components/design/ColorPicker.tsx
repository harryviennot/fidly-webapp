'use client';

import { useEffect, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Plus, Eyedropper } from '@phosphor-icons/react';
import { LabelWithTooltip } from './FieldTooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  /**
   * Optional labeled row of preset swatches rendered above the standard
   * palette. BrandingForm uses this to surface colors extracted from the
   * user's logo as "From your logo" quick-picks.
   */
  extraPresets?: ColorPreset[];
  extraPresetsLabel?: string;
}

const isValidHex = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);

interface EyeDropperResult {
  sRGBHex: string;
}
interface EyeDropperApi {
  new (): { open: () => Promise<EyeDropperResult> };
}
declare global {
  interface Window {
    EyeDropper?: EyeDropperApi;
  }
}

function useEyeDropperSupport(): boolean {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupported(true);
    }
  }, []);
  return supported;
}

function Swatch({
  hex,
  isSelected,
  onClick,
  title,
}: {
  hex: string;
  isSelected: boolean;
  onClick: () => void;
  title: string;
}) {
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

/**
 * Color picker for the design editor.
 *
 * Vertical reading order:
 *   1. Label row
 *   2. "From your logo" preset row (when populated)
 *   3. Standard palette swatches + user-added custom colors
 *   4. Action row: current color preview + hex input + "+" (custom picker)
 *      + eyedropper (only on Chromium-class browsers).
 *
 * The action row at the bottom is intentionally a single horizontal control
 * cluster so the "where's the eyedropper?" question has a single answer.
 */
export function ColorPicker({
  label,
  tooltip,
  colors,
  value,
  onChange,
  annotation,
  customColors = [],
  onCustomColor,
  extraPresets,
  extraPresetsLabel,
}: ColorPickerProps) {
  const [customInput, setCustomInput] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingPick, setPendingPick] = useState(value);
  const eyeDropperSupported = useEyeDropperSupport();

  const pickFromScreen = async () => {
    if (!window.EyeDropper) return;
    try {
      const result = await new window.EyeDropper().open();
      onChange(result.sRGBHex);
      onCustomColor?.(result.sRGBHex);
    } catch {
      // User pressed Escape — no-op.
    }
  };

  const commitCustomColor = (hex: string) => {
    onChange(hex);
    onCustomColor?.(hex);
  };

  const displayHex = customInput || value.replace('#', '');

  const presetValues = new Set(
    [...colors, ...(extraPresets ?? [])].map((c) => c.value.toLowerCase())
  );
  const uniqueCustom = customColors.filter((c) => !presetValues.has(c.toLowerCase()));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <LabelWithTooltip tooltip={tooltip}>{label}</LabelWithTooltip>
        {annotation && (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {annotation}
          </span>
        )}
      </div>

      {extraPresets && extraPresets.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {extraPresetsLabel && (
            <p className="wiz-micro text-[#888]">{extraPresetsLabel}</p>
          )}
          <div className="flex gap-2 flex-wrap">
            {extraPresets.map((color) => (
              <Swatch
                key={`extra-${color.value}`}
                hex={color.value}
                isSelected={value.toLowerCase() === color.value.toLowerCase()}
                onClick={() => {
                  onChange(color.value);
                  setCustomInput('');
                }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {colors.map((color) => (
          <Swatch
            key={color.value}
            hex={color.value}
            isSelected={value.toLowerCase() === color.value.toLowerCase()}
            onClick={() => {
              onChange(color.value);
              setCustomInput('');
            }}
            title={color.name}
          />
        ))}
        {uniqueCustom.map((hex) => (
          <Swatch
            key={hex}
            hex={hex}
            isSelected={value.toLowerCase() === hex.toLowerCase()}
            onClick={() => {
              onChange(hex);
              setCustomInput('');
            }}
            title={hex}
          />
        ))}
      </div>

      {/* Action row: live preview, hex input, custom-picker, eyedropper.
          One row, left-to-right, so users always know where to look. */}
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-md flex-shrink-0"
          style={{
            backgroundColor: value,
            border: `1px solid ${value.toLowerCase() === '#ffffff' ? '#DDD' : 'rgba(0,0,0,0.08)'}`,
          }}
        />
        <div className="flex flex-1 min-w-0">
          <span className="px-2 py-2 rounded-l-md border border-r-0 border-border bg-muted/50 text-xs text-muted-foreground select-none">
            #
          </span>
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
                commitCustomColor('#' + customInput);
              }
              setCustomInput('');
            }}
            placeholder={value.replace('#', '')}
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-r-md border border-border bg-white text-xs text-foreground font-mono tracking-wider outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <Popover
          open={popoverOpen}
          onOpenChange={(open) => {
            setPopoverOpen(open);
            if (open) {
              setPendingPick(value);
            } else if (pendingPick.toLowerCase() !== value.toLowerCase()) {
              onCustomColor?.(pendingPick);
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              title="Custom color"
              className="w-9 h-9 rounded-md border border-border bg-white hover:bg-muted/50 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4 text-foreground" weight="bold" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[240px] p-3 flex flex-col gap-3"
            align="end"
            sideOffset={8}
          >
            <HexColorPicker
              color={pendingPick}
              onChange={(hex) => {
                setPendingPick(hex);
                onChange(hex);
              }}
              style={{ width: '100%', height: 180 }}
            />
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-md flex-shrink-0 border border-[var(--border-light)]"
                style={{ backgroundColor: pendingPick }}
              />
              <input
                type="text"
                value={pendingPick.replace('#', '').toUpperCase()}
                maxLength={6}
                onChange={(e) => {
                  const v = e.target.value.replace('#', '').slice(0, 6);
                  const candidate = '#' + v;
                  if (isValidHex(candidate)) {
                    setPendingPick(candidate);
                    onChange(candidate);
                  } else {
                    setPendingPick('#' + v.padEnd(6, '0'));
                  }
                }}
                className="flex-1 min-w-0 px-2 py-1.5 rounded-md border border-border bg-white text-xs text-foreground font-mono tracking-wider outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
          </PopoverContent>
        </Popover>
        {eyeDropperSupported && (
          <button
            type="button"
            onClick={pickFromScreen}
            title="Pick a color from anywhere on the page"
            className="w-9 h-9 rounded-md border border-border bg-white hover:bg-muted/50 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <Eyedropper className="w-4 h-4 text-foreground" weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
}
