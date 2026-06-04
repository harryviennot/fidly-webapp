import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A circular progress ring with centered content. Generic — SVG stroke-dashoffset
 * arc, animates on value change. `value` is 0..1.
 */
export function CompletionRing({
  value,
  size = 84,
  stroke = 9,
  color = "var(--accent)",
  className,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  className?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - clamped);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-[var(--muted)]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {children}
      </div>
    </div>
  );
}
