"use client";

import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  /** Optional legend items rendered to the right of the title */
  legend?: React.ReactNode;
  /** Optional dropdown or control rendered far-right */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function ChartCard({
  title,
  legend,
  headerRight,
  children,
  delay = 0,
  className,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px_20px] animate-slide-up",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)]">
            {title}
          </h3>
          {legend}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

/** Small colored square + label for chart legends */
export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-2 h-2 rounded-[2px]"
        style={{ background: color }}
      />
      <span className="text-[11px] text-[#888]">{label}</span>
    </div>
  );
}
