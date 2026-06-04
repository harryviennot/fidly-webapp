"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Thin linear progress bar. Fills from 0 → `value` on mount so the bar always
 * animates in (a plain `width` style only transitions on *later* changes, not on
 * first paint). `value` is 0..1, clamped.
 *
 * Defaults to the success-green token — the shared "positive progress" color.
 * Pass `color` to override (e.g. a per-category achievement color).
 */
export function ProgressBar({
  value,
  color = "var(--success)",
  className,
  trackClassName,
}: {
  value: number;
  /** Fill color. Defaults to the success-green token. */
  color?: string;
  /** Classes for the moving fill (rarely needed). */
  className?: string;
  /** Classes for the track — override height/width here (e.g. `h-2`, `w-28`). */
  trackClassName?: string;
}) {
  // Start empty, then fill to `value` on the next frame so the transition fires
  // even on first paint. rAF guarantees the 0% width is committed first.
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setFill(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const pct = Math.round(Math.max(0, Math.min(1, fill)) * 100);

  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]", trackClassName)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", className)}
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
