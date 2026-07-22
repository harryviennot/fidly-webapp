"use client";

import * as React from "react";
import { Minus, Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface NumberFieldProps {
  /** Controlled value, kept as a string so empty / partial input is representable. */
  value: string | number;
  /** Fires with the next string value (clamped on stepper, raw on typing). */
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  /** Short unit drawn inside the field, after the number (e.g. "pts"). */
  suffix?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * A number input with comfortable −/+ steppers instead of the cramped native
 * spinner arrows (which are hidden). Meant as the project's standard number
 * control: tappable on touch, clamps to min/max, and keeps an empty string
 * representable so a field can start blank. Drop-in replacement for a bare
 * `<Input type="number" />`.
 */
export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  suffix,
  disabled,
  id,
  className,
  "aria-label": ariaLabel,
}: NumberFieldProps) {
  const numeric = typeof value === "string" ? parseFloat(value) : value;
  const hasValue = !Number.isNaN(numeric);

  const clamp = (n: number) => {
    let next = n;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    return next;
  };

  // Latest props read by the auto-repeat timer (which outlives a single render).
  const stateRef = React.useRef({ value, min, step, clamp, onChange });
  React.useEffect(() => {
    stateRef.current = { value, min, step, clamp, onChange };
  });
  const holdTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const doStep = (dir: 1 | -1): { value: number; changed: boolean } => {
    const s = stateRef.current;
    const cur = parseFloat(String(s.value));
    const base = Number.isNaN(cur) ? (s.min ?? 0) : cur;
    const next = s.clamp(base + dir * s.step);
    const changed = next !== base;
    // Optimistically advance our ref so the next timer tick computes from the
    // new value even before React re-renders with it.
    s.value = String(next);
    if (changed) s.onChange(String(next));
    return { value: next, changed };
  };

  const stopHold = React.useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const startHold = (dir: 1 | -1) => {
    // First step is immediate; then accelerate from a slow repeat to a fast one
    // while the button stays pressed, stopping when a bound is hit.
    if (!doStep(dir).changed) return;
    let delay = 380;
    const tick = () => {
      if (!doStep(dir).changed) {
        stopHold();
        return;
      }
      delay = Math.max(35, delay * 0.82);
      holdTimer.current = setTimeout(tick, delay);
    };
    holdTimer.current = setTimeout(tick, delay);
  };

  React.useEffect(() => stopHold, [stopHold]);

  const atMin = min != null && hasValue && numeric <= min;
  const atMax = max != null && hasValue && numeric >= max;

  const stepperBase =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted-gray)] " +
    "transition-colors hover:text-[var(--foreground)] hover:bg-[var(--paper)] active:scale-95 " +
    "disabled:opacity-30 disabled:pointer-events-none cursor-pointer";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-white/50 dark:bg-white/5 p-1",
        "transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--accent)]/50 focus-within:border-[var(--accent)]",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease"
        tabIndex={-1}
        className={stepperBase}
        onPointerDown={(e) => {
          if (e.button && e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          startHold(-1);
        }}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
        onPointerLeave={stopHold}
        disabled={disabled || atMin}
      >
        <Minus className="h-4 w-4" weight="bold" />
      </button>

      <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          aria-label={ariaLabel}
          value={value}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full min-w-[2ch] bg-transparent text-center text-[15px] font-semibold tabular-nums text-foreground",
            "placeholder:font-normal placeholder:text-muted-foreground outline-none",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          )}
        />
        {suffix && hasValue && (
          <span className="pointer-events-none shrink-0 text-[13px] font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>

      <button
        type="button"
        aria-label="Increase"
        tabIndex={-1}
        className={stepperBase}
        onPointerDown={(e) => {
          if (e.button && e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          startHold(1);
        }}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
        onPointerLeave={stopHold}
        disabled={disabled || atMax}
      >
        <Plus className="h-4 w-4" weight="bold" />
      </button>
    </div>
  );
}
