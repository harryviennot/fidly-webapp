"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { CustomerSegment } from "@/lib/customer-segments";

const SEGMENTS: (CustomerSegment | "all")[] = [
  "all",
  "new",
  "vip",
  "close_to_reward",
  "at_risk",
  "regular",
];

const SEGMENT_LABEL_KEYS: Record<CustomerSegment | "all", string> = {
  all: "segments.all",
  new: "segments.new",
  regular: "segments.regular",
  vip: "segments.vip",
  close_to_reward: "segments.closeToReward",
  at_risk: "segments.atRisk",
};

interface CustomerSegmentFiltersProps {
  segments: Record<CustomerSegment, number>;
  totalCount: number;
  selected: CustomerSegment | "all";
  onSelect: (segment: CustomerSegment | "all") => void;
}

export function CustomerSegmentFilters({
  segments,
  totalCount,
  selected,
  onSelect,
}: CustomerSegmentFiltersProps) {
  const t = useTranslations("customers");

  return (
    <div className="flex flex-wrap gap-2">
      {SEGMENTS.map((segment) => {
        const count = segment === "all" ? totalCount : segments[segment];
        const isActive = selected === segment;

        // Don't show segment if count is 0 (except "all")
        if (segment !== "all" && count === 0) return null;

        return (
          <button
            key={segment}
            onClick={() => onSelect(segment)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 border",
              isActive
                ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                : "bg-[var(--cream)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--accent-muted)]/50 hover:text-[var(--accent)]"
            )}
          >
            {t(SEGMENT_LABEL_KEYS[segment])}
            <span
              className={cn(
                "text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center",
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CustomerSegmentFiltersSkeleton() {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-8 rounded-lg bg-[var(--muted)] animate-pulse"
          style={{ width: `${60 + i * 20}px` }}
        />
      ))}
    </div>
  );
}
