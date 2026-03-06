"use client";

import { useTranslations } from "next-intl";
import { FilterPill } from "@/components/reusables/filter-pill";
import type { CustomerSegment } from "@/lib/customer-segments";

const SEGMENTS: (CustomerSegment | "all")[] = [
  "all",
  "new",
  "regular",
  "vip",
  "close_to_reward",
  "at_risk",
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
    <div className="flex flex-wrap gap-1.5">
      {SEGMENTS.map((segment) => {
        const count = segment === "all" ? totalCount : segments[segment];

        // Don't show segment if count is 0 (except "all")
        if (segment !== "all" && count === 0) return null;

        return (
          <FilterPill
            key={segment}
            label={t(SEGMENT_LABEL_KEYS[segment])}
            count={count}
            isActive={selected === segment}
            onClick={() => onSelect(segment)}
          />
        );
      })}
    </div>
  );
}

export function CustomerSegmentFiltersSkeleton() {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-7 rounded-full bg-[var(--muted)] animate-pulse"
          style={{ width: `${50 + i * 15}px` }}
        />
      ))}
    </div>
  );
}
