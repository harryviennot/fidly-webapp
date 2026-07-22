"use client";

import { useTranslations } from "next-intl";
import type { SingleSelectFilterGroup } from "@/components/reusables/search-bar";
import type { CustomerSegment } from "@/lib/customer-segments";

const SEGMENTS: (CustomerSegment | "all")[] = [
  "all",
  "new",
  "regular",
  "vip",
  "reward_ready",
  "close_to_reward",
  "at_risk",
  "ghost",
];

const SEGMENT_LABEL_KEYS: Record<CustomerSegment | "all", string> = {
  all: "segments.all",
  new: "segments.new",
  regular: "segments.regular",
  vip: "segments.vip",
  reward_ready: "segments.rewardReady",
  close_to_reward: "segments.closeToReward",
  at_risk: "segments.atRisk",
  ghost: "segments.ghost",
};

interface UseCustomerSegmentFilterGroupArgs {
  segments: Record<CustomerSegment, number>;
  totalCount: number;
  selected: CustomerSegment | "all";
  onSelect: (segment: CustomerSegment | "all") => void;
  /** Points programs never produce close_to_reward (no fixed card size). */
  isPoints?: boolean;
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
  isPoints = false,
}: UseCustomerSegmentFilterGroupArgs): SingleSelectFilterGroup {
  const t = useTranslations("customers");

  const visibleSegments = isPoints
    ? SEGMENTS.filter((s) => s !== "close_to_reward")
    : SEGMENTS;

  return {
    id: "segment",
    label: t("segments.label"),
    value: selected === "all" ? null : selected,
    allValue: "all",
    onChange: (v) => onSelect((v ?? "all") as CustomerSegment | "all"),
    options: visibleSegments.map((segment) => {
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
