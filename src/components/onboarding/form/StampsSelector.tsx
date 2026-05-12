'use client';

import { useId } from 'react';
import { StampIconSvg, type StampIconType } from '@/components/design/StampIconPicker';
import { computeCardColors } from '@/lib/card-utils';
import { cn } from '@/lib/utils';
import type { CardDesign } from '@/types';

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
}

const DEFAULT_MIN = 2;
const DEFAULT_MAX = 21;

/**
 * Stamp-count picker. Renders the row of stamp dots in the card's accent
 * color (filled when ≤ value), with a draggable slider underneath. Matches
 * the visual language of the wallet card preview so the relationship
 * between this control and the preview is obvious.
 */
export function StampsSelector({
  value,
  onChange,
  activeDesign,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  ariaLabel,
}: StampsSelectorProps) {
  const id = useId();
  const range = max - min;
  const stampIcon = (activeDesign?.stamp_icon || 'checkmark') as StampIconType;
  const rewardIcon = (activeDesign?.reward_icon || 'gift') as StampIconType;
  const colors = activeDesign ? computeCardColors(activeDesign) : null;
  const accentHex = colors?.accentHex ?? '#4A7C59';
  const iconColorHex = colors?.iconColorHex ?? '#fff';
  const fillPercent = range === 0 ? 0 : ((value - min) / range) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="wiz-helper text-[#888]">{min}–{max}</span>
        <span
          className="wiz-h font-bold tabular-nums leading-none"
          style={{ color: accentHex }}
        >
          {value}
        </span>
      </div>

      <div className="flex flex-wrap gap-[6px]">
        {Array.from({ length: max }, (_, i) => {
          const n = i + 1;
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
                'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200',
                clickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                !isActive && clickable && 'scale-[0.85] hover:scale-95'
              )}
              style={{
                backgroundColor: isActive ? accentHex : 'var(--border)',
                boxShadow: isActive ? `0 2px 8px ${accentHex}40` : 'none',
                transitionDelay: isActive ? `${Math.min(i * 15, 150)}ms` : '0ms',
              }}
              aria-label={`${n} stamps`}
            >
              {isActive ? (
                <StampIconSvg
                  icon={isLast ? rewardIcon : stampIcon}
                  className="w-3.5 h-3.5"
                  color={iconColorHex}
                />
              ) : (
                <span className="wiz-micro font-bold text-[#BBB]">{n}</span>
              )}
            </button>
          );
        })}
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className={cn(
          'w-full h-1.5 rounded-full appearance-none cursor-pointer',
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
          box-shadow: 0 2px 6px ${accentHex}50;
        }
        #${id}::-webkit-slider-thumb:hover {
          box-shadow: 0 2px 10px ${accentHex}70;
        }
        #${id}::-moz-range-thumb {
          background: ${accentHex} !important;
          box-shadow: 0 2px 6px ${accentHex}50;
        }
      `}</style>
    </div>
  );
}
