"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ViewToggleOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface ViewToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ViewToggleOption<T>[];
  className?: string;
  /**
   * "subtle" (default) is the low-contrast view switcher used in toolbars.
   * "solid" is a high-contrast segmented control: a muted track with a white
   * selected pill, for primary in-form choices.
   */
  variant?: "subtle" | "solid";
  /** Stretch to fill the container, each option taking an equal share. */
  fullWidth?: boolean;
}

export function ViewToggle<T extends string>({
  value,
  onChange,
  options,
  className,
  variant = "subtle",
  fullWidth = false,
}: ViewToggleProps<T>) {
  const solid = variant === "solid";
  return (
    <div
      role="tablist"
      className={cn(
        "items-center rounded-lg border p-0.5",
        fullWidth ? "flex w-full" : "inline-flex",
        solid
          ? "border-[var(--border-medium)] bg-[var(--muted)]"
          : "border-[var(--border)] bg-[var(--background)]",
        className,
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
              fullWidth && "flex-1",
              selected
                ? solid
                  ? "bg-white text-[#1A1A1A] font-semibold shadow-sm"
                  : "bg-[var(--muted)] text-[var(--foreground)]"
                : solid
                  ? "text-[#8A8A8A] hover:text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
