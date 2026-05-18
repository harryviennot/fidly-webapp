'use client';

import { useId } from 'react';
import { StampIconSvg, type StampIconType } from '@/components/design/StampIconPicker';
import { computeCardColors } from '@/lib/card-utils';
import { cn } from '@/lib/utils';
import type { CardDesign } from '@/types';

type CSSPropertiesWithVars = React.CSSProperties & Record<`--${string}`, string | number>;

interface StampsSelectorProps {
  value: number;
  onChange: (next: number) => void;
  /** Currently active card design — drives the stamp icon + accent colour. */
  activeDesign?: CardDesign | null;
  /** Minimum stamp count. Defaults to 2 (a 1-stamp card is degenerate). */
  min?: number;
  /** Maximum stamp count. Defaults to 21. */
  max?: number;
  /** Optional name for the visually-hidden range input. */
  ariaLabel?: string;
  /**
   * How to color the filled stamp dots and active slider track:
   *  - `'design'` (default): derive from `activeDesign` via `computeCardColors`.
   *    Used everywhere the picker reflects the user's chosen card colors
   *    (dashboard design editor, design preview).
   *  - `'accent'`: use `var(--accent)` and white icons. Used in the
   *    onboarding wizard's loyalty-program step so the picker matches the
   *    Continue button accent before the user has picked any card colors.
   */
  dotColorMode?: 'design' | 'accent';
}

const DEFAULT_MIN = 2;
const DEFAULT_MAX = 21;

/**
 * Stamp-count picker. Renders the dots in a **two-row brick layout** — the
 * top row holds `ceil(max/2)` stamps, the bottom row holds the remainder
 * offset by half a stamp so the rows interlock instead of ending in a
 * ragged "missing stamp" slot.
 *
 * The slider sits beneath the picker for fast coarse selection; tapping
 * an individual dot is the fine control.
 */
export function StampsSelector({
  value,
  onChange,
  activeDesign,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  ariaLabel,
  dotColorMode = 'design',
}: StampsSelectorProps) {
  const id = useId();
  const range = max - min;
  const stampIcon = (activeDesign?.stamp_icon || 'checkmark') as StampIconType;
  const rewardIcon = (activeDesign?.reward_icon || 'gift') as StampIconType;
  const colors = activeDesign ? computeCardColors(activeDesign) : null;
  // `--accent` is set on the onboarding layout (orange) and updated when the
  // user picks design colors. Using the CSS variable keeps the picker in
  // sync with the wizard's Continue button without recomputing here.
  const accentHex = dotColorMode === 'accent'
    ? 'var(--accent)'
    : colors?.accentHex ?? 'var(--accent)';
  const iconColorHex = dotColorMode === 'accent'
    ? '#fff'
    : colors?.iconColorHex ?? '#fff';
  // The dot/slider shadows want a translucent accent. With a hex value we
  // append `50` (32% alpha) directly; with a CSS variable we need
  // `color-mix` because `var(--accent)50` is not valid CSS.
  const accentAlpha = (alphaPct: number) =>
    dotColorMode === 'accent'
      ? `color-mix(in srgb, var(--accent) ${alphaPct}%, transparent)`
      : `${accentHex}${Math.round((alphaPct / 100) * 255).toString(16).padStart(2, '0')}`;
  const fillPercent = range === 0 ? 0 : ((value - min) / range) * 100;

  // Brick split: top row gets the ceiling. 21 → 11 + 10. 20 → 10 + 10.
  const row1Count = Math.ceil(max / 2);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="wiz-helper text-[#888]">
          {min}–{max}
        </span>
        <span
          className="wiz-h font-bold tabular-nums leading-none"
          style={{ color: accentHex }}
        >
          {value}
        </span>
      </div>

      {/*
        Brick container. Cell size is `clamp(min, fluid, max)` where the
        fluid value computes the largest cell that lets row 1 (11 stamps +
        10 gaps) fit inside the form column. So the dots grow with the
        viewport — at 360 px they're ~26 px, at 390 px ~29 px, and they
        cap at 38 px once there's room. Desktop bumps the gap up for
        breathing room but keeps the same max cell size.

        `items-center` does the brick interlock for free: row 2 has one
        fewer dot, so centering both rows shifts the lower row right by
        exactly `(cell + gap) / 2` — half the pitch between adjacent
        stamps.
      */}
      <div
        className={cn(
          'flex flex-col items-center',
          '[--stamp-gap:4px] min-[768px]:[--stamp-gap:6px]',
          '[--stamp-cell:clamp(22px,calc((100vw-72px)/11),38px)]',
          '[gap:var(--stamp-gap)]'
        )}
      >
        <div className="flex [gap:var(--stamp-gap)]">
          {Array.from({ length: row1Count }, (_, i) =>
            renderStamp(i + 1)
          )}
        </div>
        <div className="flex [gap:var(--stamp-gap)]">
          {Array.from({ length: max - row1Count }, (_, i) =>
            renderStamp(row1Count + i + 1)
          )}
        </div>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className={cn(
          'w-full h-1.5 rounded-full appearance-none cursor-pointer mt-2',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:transition-shadow',
          '[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-grab'
        )}
        style={{
          background: `linear-gradient(to right, ${accentHex} ${fillPercent}%, var(--border) ${fillPercent}%)`,
          WebkitAppearance: 'none',
        }}
        aria-label={ariaLabel}
      />
      <style>{`
        #${id}::-webkit-slider-thumb {
          background: ${accentHex} !important;
          box-shadow: 0 2px 6px ${accentAlpha(31)};
        }
        #${id}::-webkit-slider-thumb:hover {
          box-shadow: 0 2px 10px ${accentAlpha(44)};
        }
        #${id}::-moz-range-thumb {
          background: ${accentHex} !important;
          box-shadow: 0 2px 6px ${accentAlpha(31)};
        }
      `}</style>
    </div>
  );

  function renderStamp(n: number) {
    const isActive = n <= value;
    const isLast = n === value;
    const clickable = n >= min;
    return (
      <button
        key={n}
        type="button"
        onClick={() => clickable && onChange(n)}
        disabled={!clickable}
        className={cn(
          'rounded-full flex items-center justify-center transition-all duration-200',
          '[width:var(--stamp-cell)] [height:var(--stamp-cell)]',
          clickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
          !isActive && clickable && 'scale-[0.85] hover:scale-95'
        )}
        style={
          {
            backgroundColor: isActive ? accentHex : 'var(--border)',
            boxShadow: isActive ? `0 2px 8px ${accentAlpha(25)}` : 'none',
            transitionDelay: isActive
              ? `${Math.min((n - 1) * 15, 150)}ms`
              : '0ms',
          } as CSSPropertiesWithVars
        }
        aria-label={`${n} stamps`}
      >
        {isActive ? (
          <StampIconSvg
            icon={isLast ? rewardIcon : stampIcon}
            className="[width:calc(var(--stamp-cell)*0.55)] [height:calc(var(--stamp-cell)*0.55)]"
            color={iconColorHex}
          />
        ) : (
          <span className="text-[10px] font-bold text-[#BBB]">{n}</span>
        )}
      </button>
    );
  }
}
