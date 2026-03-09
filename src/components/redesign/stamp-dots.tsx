"use client";

import { cn } from "@/lib/utils";

interface StampDotsProps {
  filled: number;
  total?: number;
  size?: number;
  showCount?: boolean;
  /** Custom filled dot color (defaults to --accent) */
  filledColor?: string;
  /** Custom unfilled dot color (defaults to --border) */
  unfilledColor?: string;
  /** Custom unfilled border color (defaults to --border-medium) */
  unfilledBorderColor?: string;
  className?: string;
}

export function StampDots({
  filled,
  total = 10,
  size = 14,
  showCount = true,
  filledColor,
  unfilledColor,
  unfilledBorderColor,
  className,
}: StampDotsProps) {
  return (
    <div className={cn("flex items-center gap-[3px] flex-wrap", className)}>
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < filled;
        return (
          <div
            key={i}
            className="rounded-full flex items-center justify-center text-white"
            style={{
              width: size,
              height: size,
              fontSize: size * 0.55,
              background: isFilled
                ? (filledColor || "var(--accent)")
                : (unfilledColor || "var(--border)"),
              border: !isFilled
                ? `1px solid ${unfilledBorderColor || "var(--border-medium)"}`
                : undefined,
            }}
          >
            {isFilled ? "★" : ""}
          </div>
        );
      })}
      {showCount && (
        <span className="text-[11px] text-[var(--muted-foreground)] ml-1 font-medium">
          {filled}/{total}
        </span>
      )}
    </div>
  );
}
