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

/**
 * Detects the EyeDropper API only in browsers that ship it (Chromium-based
 * as of 2026). Returns `false` during SSR and on Safari/Firefox so the
 * picker button is hidden rather than failing on click. Capability detection
 * has to happen post-hydration to avoid an SSR mismatch — the
 * `set-state-in-effect` rule is intentionally too strict for this idiom.
 */
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
 * Layout:
 *  1. Label row (with optional tooltip + annotation pill)
 *  2. "From your logo" preset row (only when `extraPresets` is non-empty)
 *  3. Standard preset palette + user-added custom colors + `+` (custom
 *     picker) + eyedropper (only when the browser exposes `window.EyeDropper`)
 *
 * The standalone hex input row that used to live below the swatches is gone
 * — the custom-color popover has its own hex input, so there's no value in
 * a second one.
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
  // Popover-local pending color so dragging the picker doesn't spam
  // `onCustomColor` until the user commits (closes the popover). Sync is
  // done in `onOpenChange` rather than in an effect so we don't trip
  // the `react-hooks/set-state-in-effect` rule.
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

  // Deduplicate custom colors against standard + extra presets.
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
                onClick={() => onChange(color.value)}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Standard preset palette + custom colors + custom-picker + eyedropper. */}
      <div className="flex gap-2 flex-wrap items-center">
        {colors.map((color) => (
          <Swatch
            key={color.value}
            hex={color.value}
            isSelected={value.toLowerCase() === color.value.toLowerCase()}
            onClick={() => onChange(color.value)}
            title={color.name}
          />
        ))}
        {uniqueCustom.map((hex) => (
          <Swatch
            key={hex}
            hex={hex}
            isSelected={value.toLowerCase() === hex.toLowerCase()}
            onClick={() => onChange(hex)}
            title={hex}
          />
        ))}
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
              className="w-8 h-8 rounded-md border-2 border-dashed border-border flex items-center justify-center hover:border-muted-foreground transition-colors cursor-pointer bg-transparent flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[240px] p-3 flex flex-col gap-3"
            align="start"
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
            className="w-8 h-8 rounded-md border-2 border-dashed border-border flex items-center justify-center hover:border-muted-foreground transition-colors cursor-pointer bg-transparent flex-shrink-0"
          >
            <Eyedropper className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
}
