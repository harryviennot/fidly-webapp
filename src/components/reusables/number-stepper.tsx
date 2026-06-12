'use client';

import { useCallback, useEffect, useRef } from 'react';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface NumberStepperProps {
  /** Current value. `null` is the "empty" state (see `allowEmpty`). */
  value: number | null;
  onChange: (next: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /** When true, decrementing below `min` lands on `null` (and incrementing
   *  from `null` lands on `min`). Shows `emptyLabel` in the empty state —
   *  used for "no limit" style settings. */
  allowEmpty?: boolean;
  /** Text shown when value is null (e.g. "No limit"). */
  emptyLabel?: string;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

// Press-and-hold timings: first repeat after 400ms, then every 80ms.
const HOLD_DELAY_MS = 400;
const HOLD_INTERVAL_MS = 80;

/**
 * +/- number stepper with press-and-hold repeat. Replaces native
 * `<input type="number">` (tiny spin arrows, awkward on touch) for small
 * bounded settings like stamp counts.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  allowEmpty = false,
  emptyLabel,
  disabled = false,
  'aria-label': ariaLabel,
  className,
}: NumberStepperProps) {
  // Refs so the hold-repeat interval always steps from the latest value
  // without re-arming timers on every render.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stepOnce = useCallback(
    (dir: 1 | -1) => {
      const current = valueRef.current;
      if (dir === 1) {
        if (current == null) {
          onChange(min);
          return;
        }
        onChange(Math.min(current + step, max));
        return;
      }
      if (current == null) return;
      const next = current - step;
      if (next < min) {
        if (allowEmpty) onChange(null);
        return;
      }
      onChange(next);
    },
    [onChange, min, max, step, allowEmpty]
  );

  const stopHold = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  }, []);

  const startHold = useCallback(
    (dir: 1 | -1) => {
      stepOnce(dir);
      timerRef.current = setTimeout(() => {
        intervalRef.current = setInterval(() => stepOnce(dir), HOLD_INTERVAL_MS);
      }, HOLD_DELAY_MS);
    },
    [stepOnce]
  );

  useEffect(() => stopHold, [stopHold]);

  const canDecrement = !disabled && value != null && (value > min || allowEmpty);
  const canIncrement = !disabled && (value == null || value < max);

  const btnClass =
    'flex items-center justify-center w-9 h-9 text-[#555] transition-colors ' +
    'hover:bg-[var(--paper-hover)] active:bg-[var(--muted)] ' +
    'disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40';

  return (
    <div
      role="spinbutton"
      aria-valuenow={value ?? undefined}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-stretch rounded-lg border border-[var(--border-medium)] bg-white overflow-hidden select-none',
        disabled && 'opacity-60',
        className
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        disabled={!canDecrement}
        onPointerDown={(e) => {
          e.preventDefault();
          startHold(-1);
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(btnClass, 'border-r border-[var(--border-light)]')}
        aria-label="-"
      >
        <MinusIcon className="w-3.5 h-3.5" weight="bold" />
      </button>
      <div
        className={cn(
          'flex items-center justify-center px-3 min-w-[64px] text-[13px] tabular-nums',
          value == null ? 'text-[#A0A0A0]' : 'font-semibold text-[#1A1A1A]'
        )}
      >
        {value == null ? emptyLabel ?? '—' : value}
      </div>
      <button
        type="button"
        tabIndex={-1}
        disabled={!canIncrement}
        onPointerDown={(e) => {
          e.preventDefault();
          startHold(1);
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(btnClass, 'border-l border-[var(--border-light)]')}
        aria-label="+"
      >
        <PlusIcon className="w-3.5 h-3.5" weight="bold" />
      </button>
    </div>
  );
}
