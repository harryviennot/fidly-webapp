'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  /** Field label. Pass empty string to render the picker without a header
   *  (used when the picker is nested inside another labelled control). */
  label: string;
  tooltip: string;
  colors: readonly ColorPreset[];
  value: string;
  onChange: (hex: string) => void;
  annotation?: string;
  customColors?: string[];
  onCustomColor?: (hex: string) => void;
  /**
   * Logo-derived swatches surfaced as the left zone of the swatch row,
   * labelled "From your logo". The right zone holds customs + standard
   * presets. The two zones are separated by a thin vertical divider.
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

// Min / max bounds for the dynamic total-swatch budget. The actual cap is
// computed from container width by `useFitCount`. Min ensures the picker
// always has at least a few colors; max prevents an absurdly wide column
// (multi-monitor / external display) from showing 30+ tiny chips.
const MIN_SWATCH_CAP = 8;
const MAX_SWATCH_CAP = 22;
// Per-item breathing room — bumped to 8px so spacing kicks in at moderate
// widths instead of cramming. Each "slot" the fit math uses is therefore
// SWATCH + GAP = 40px.
const MIN_GAP = 8;
// Mobile renders two grid rows with a separator on each, so the budget is
// `perRowCount * MOBILE_ROW_COUNT`.
const MOBILE_ROW_COUNT = 2;

function Swatch({
  hex,
  isSelected,
  onClick,
  title,
  size = 32,
}: {
  hex: string;
  isSelected: boolean;
  onClick: () => void;
  title: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md transition-transform duration-150 ease-out hover:scale-110 active:scale-95 focus:outline-none flex-shrink-0"
      style={{
        width: size,
        height: size,
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
 * Width-aware swatch counter. Measures the inner row container and figures
 * out how many right-zone swatches fit at the current viewport width. When
 * the container shrinks (sidebar collapse, window resize), the right zone
 * sheds swatches from the end so the row never wraps unexpectedly on
 * desktop. Mobile (<640px) opts out and uses a wrapping 2-row layout.
 */
/**
 * Returns the total swatch budget (logo + right combined) that fits at the
 * current container width. On desktop the row is single-line; on mobile the
 * row splits into `MOBILE_ROW_COUNT` rows with a separator on each, so the
 * budget multiplies. The 8px MIN_GAP makes the math feel "earlier" — the
 * cap kicks in at moderate widths so swatches don't pack in.
 */
function useFitCount(
  ref: React.RefObject<HTMLDivElement | null>,
  isMobile: boolean,
  hasSeparator: boolean
): number {
  const [count, setCount] = useState(MIN_SWATCH_CAP);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const SWATCH = 32;
    const SEP = 3;
    const calc = () => {
      const width = el.offsetWidth;
      const sepWidth = hasSeparator ? SEP + MIN_GAP : 0;
      const available = width - sepWidth;
      const perRow = Math.max(1, Math.floor((available + MIN_GAP) / (SWATCH + MIN_GAP)));
      const total = perRow * (isMobile ? MOBILE_ROW_COUNT : 1);
      setCount(Math.max(MIN_SWATCH_CAP, Math.min(MAX_SWATCH_CAP, total)));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, isMobile, hasSeparator]);
  return count;
}

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNarrow(mql.matches);
    const handler = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return narrow;
}

/**
 * Color picker for the design editor.
 *
 * Row structure (top → bottom):
 *   1. Field label (+ tooltip + optional annotation pill)
 *   2. "From your logo" sub-label (only when extraPresets is populated)
 *   3. Swatch row — left zone: logo presets (up to 3 + "+N" badge);
 *      separator; right zone: recent customs (newest-first) followed by
 *      standard preset palette. Width-adapts on desktop, wraps on mobile.
 *   4. Action row — current color chip + hex input + custom picker (`+`)
 *      + eyedropper (when the browser exposes `window.EyeDropper`).
 *
 * Most recent custom colors live immediately after the separator, so each
 * pick pushes the standard palette one slot to the right.
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
  extraPresetsLabel: _ignoredLabel,
}: ColorPickerProps) {
  void _ignoredLabel;
  const [customInput, setCustomInput] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingPick, setPendingPick] = useState(value);
  // Snapshot of `value` at the moment the popover opens. We need this
  // because `onChange` fires on every drag of the react-colorful picker,
  // so by the time the popover closes, `value === pendingPick` (they
  // tracked together throughout the drag). The committed "did the user
  // actually pick a new color?" question can only be answered against the
  // pre-open value.
  const popoverInitialValueRef = useRef(value);
  const eyeDropperSupported = useEyeDropperSupport();
  const isNarrow = useIsNarrow();
  const rowRef = useRef<HTMLDivElement>(null);

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

  // Left zone — every extracted logo color, inline. No overflow badge:
  // when the logo yields 4-5 distinct colors, the right zone shrinks
  // accordingly so the row stays a single line on desktop.
  const logoVisible = extraPresets ?? [];
  // Total swatch budget across both zones — width-derived so wider columns
  // surface more colors and narrow ones don't overflow.
  const totalCap = useFitCount(rowRef, isNarrow, logoVisible.length > 0);

  // Right zone — newest-first customs, then standard presets, dedup against
  // each other and against logo presets so the same color never appears twice.
  const logoSet = new Set((extraPresets ?? []).map((c) => c.value.toLowerCase()));
  const customSet = new Set<string>();
  const rightItems: { value: string; name: string }[] = [];
  for (const hex of customColors) {
    const lower = hex.toLowerCase();
    if (logoSet.has(lower) || customSet.has(lower)) continue;
    customSet.add(lower);
    rightItems.push({ value: hex, name: hex });
  }
  for (const preset of colors) {
    const lower = preset.value.toLowerCase();
    if (logoSet.has(lower) || customSet.has(lower)) continue;
    customSet.add(lower);
    rightItems.push({ value: preset.value, name: preset.name });
  }
  // Reserve enough budget so logo + right never exceeds the dynamic total.
  const remainingBudget = Math.max(0, totalCap - logoVisible.length);
  const rightVisible = rightItems.slice(0, remainingBudget);

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <div className="flex items-center gap-2">
          <LabelWithTooltip tooltip={tooltip}>{label}</LabelWithTooltip>
          {annotation && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {annotation}
            </span>
          )}
        </div>
      )}


      {/* Swatch row.
          Desktop: every swatch is a direct flex child of `justify-between`,
          so slack distributes uniformly between every neighbour. The
          separator participates in that distribution, which keeps the gaps
          around it the same as the gaps between any two swatches.
          Mobile: two equal-height rows; logos and right items are split
          evenly across both rows so each row gets its own separator and
          the layout stays symmetric. */}
      {isNarrow ? (
        <div ref={rowRef} className="flex flex-col gap-2">
          <MobileRows
            logoVisible={logoVisible}
            rightVisible={rightVisible}
            currentValue={value}
            onChange={onChange}
          />
        </div>
      ) : (
        <div ref={rowRef} className="flex items-center justify-between">
          {logoVisible.map((color) => (
            <Swatch
              key={`logo-${color.value}`}
              hex={color.value}
              isSelected={value.toLowerCase() === color.value.toLowerCase()}
              onClick={() => onChange(color.value)}
              title={color.name}
            />
          ))}
          {logoVisible.length > 0 && rightVisible.length > 0 && (
            <div className="w-[3px] h-7 rounded-full bg-[var(--border-medium)]" />
          )}
          {rightVisible.map((item) => (
            <Swatch
              key={`r-${item.value}`}
              hex={item.value}
              isSelected={value.toLowerCase() === item.value.toLowerCase()}
              onClick={() => onChange(item.value)}
              title={item.name}
            />
          ))}
        </div>
      )}

      {/* Action row — current preview, hex input, custom picker, eyedropper. */}
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-md flex-shrink-0"
          style={{
            backgroundColor: value,
            border: `1px solid ${value.toLowerCase() === '#ffffff' ? '#DDD' : 'rgba(0,0,0,0.08)'}`,
          }}
        />
        <div className="flex flex-1 min-w-0 h-9">
          <span className="flex items-center px-2.5 rounded-l-md border border-r-0 border-border bg-muted/50 text-xs text-muted-foreground select-none">
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
            className="flex-1 min-w-0 h-full px-2.5 rounded-r-md border border-border bg-white text-xs text-foreground font-mono tracking-wider outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <Popover
          open={popoverOpen}
          onOpenChange={(open) => {
            setPopoverOpen(open);
            if (open) {
              popoverInitialValueRef.current = value;
              setPendingPick(value);
            } else if (
              pendingPick.toLowerCase() !== popoverInitialValueRef.current.toLowerCase()
            ) {
              onCustomColor?.(pendingPick);
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              title="New color"
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

/**
 * Splits logos + right swatches into exactly `MOBILE_ROW_COUNT` rows so the
 * mobile layout stays symmetric (same number of items per row, separator on
 * each row that has both zones). Floor-division on `rightPerRow` trims any
 * odd item from the end — keeps the rows balanced rather than showing 10 on
 * top and 9 on bottom.
 */
function MobileRows({
  logoVisible,
  rightVisible,
  currentValue,
  onChange,
}: {
  logoVisible: ColorPreset[];
  rightVisible: { value: string; name: string }[];
  currentValue: string;
  onChange: (hex: string) => void;
}) {
  const logoPerRow = Math.ceil(logoVisible.length / MOBILE_ROW_COUNT);
  const rightPerRow = Math.floor(rightVisible.length / MOBILE_ROW_COUNT);
  const symmetricRights = rightVisible.slice(0, rightPerRow * MOBILE_ROW_COUNT);
  return (
    <>
      {Array.from({ length: MOBILE_ROW_COUNT }, (_, rowIdx) => {
        const rowLogos = logoVisible.slice(
          rowIdx * logoPerRow,
          (rowIdx + 1) * logoPerRow
        );
        const rowRights = symmetricRights.slice(
          rowIdx * rightPerRow,
          (rowIdx + 1) * rightPerRow
        );
        if (rowLogos.length === 0 && rowRights.length === 0) return null;
        return (
          <div key={rowIdx} className="flex items-center justify-between">
            {rowLogos.map((color) => (
              <Swatch
                key={`logo-${color.value}`}
                hex={color.value}
                isSelected={currentValue.toLowerCase() === color.value.toLowerCase()}
                onClick={() => onChange(color.value)}
                title={color.name}
              />
            ))}
            {rowLogos.length > 0 && rowRights.length > 0 && (
              <div className="w-[3px] h-7 rounded-full bg-[var(--border-medium)]" />
            )}
            {rowRights.map((item) => (
              <Swatch
                key={`r-${item.value}`}
                hex={item.value}
                isSelected={currentValue.toLowerCase() === item.value.toLowerCase()}
                onClick={() => onChange(item.value)}
                title={item.name}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

