"use client";

import { useTranslations } from "next-intl";
import type { SingleSelectFilterGroup } from "@/components/reusables/search-bar";
import type { CustomerSegment } from "@/lib/customer-segments";

const SEGMENTS: (CustomerSegment | "all")[] = [
  "all",
  "new",
  "regular",
  "vip",
  "close_to_reward",
  "at_risk",
  "ghost",
];

const SEGMENT_LABEL_KEYS: Record<CustomerSegment | "all", string> = {
  all: "segments.all",
  new: "segments.new",
  regular: "segments.regular",
  vip: "segments.vip",
  close_to_reward: "segments.closeToReward",
  at_risk: "segments.atRisk",
  ghost: "segments.ghost",
};

interface UseCustomerSegmentFilterGroupArgs {
  segments: Record<CustomerSegment, number>;
  totalCount: number;
  selected: CustomerSegment | "all";
  onSelect: (segment: CustomerSegment | "all") => void;
}

/**
 * Builds the customer "segment" `FilterGroup` for `<SearchBar filters={[...]}>`.
 * Zero-count segments are hidden (except "all"); counts surface as dropdown
 * badges.
 */
export function useCustomerSegmentFilterGroup({
  segments,
  totalCount,
  selected,
  onSelect,
}: UseCustomerSegmentFilterGroupArgs): SingleSelectFilterGroup {
  const t = useTranslations("customers");

  return {
    id: "segment",
    label: t("segments.label"),
    value: selected === "all" ? null : selected,
    allValue: "all",
    onChange: (v) => onSelect((v ?? "all") as CustomerSegment | "all"),
    options: SEGMENTS.map((segment) => {
      const count = segment === "all" ? totalCount : segments[segment];
      return {
        value: segment,
        label: t(SEGMENT_LABEL_KEYS[segment]),
        count,
        hidden: segment !== "all" && count === 0,
      };
    }),
  };
}

/** Toolbar-shaped placeholder shown while the customer list loads. */
export function CustomerSegmentFiltersSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="h-9 basis-full sm:basis-auto sm:flex-1 rounded-lg bg-[var(--muted)] animate-pulse" />
        <div className="h-8 w-28 rounded-full bg-[var(--muted)] animate-pulse" />
      </div>
    </div>
  );
}
