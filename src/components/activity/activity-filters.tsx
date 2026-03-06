"use client";

import { useTranslations } from "next-intl";
import { FilterPill } from "@/components/reusables/filter-pill";
import type { TransactionType } from "@/types";

const FILTER_OPTIONS: (TransactionType | "all")[] = [
  "all",
  "stamp_added",
  "reward_redeemed",
  "stamp_voided",
  "bonus_stamp",
  "stamps_adjusted",
];

const FILTER_LABEL_KEYS: Record<TransactionType | "all", string> = {
  all: "filters.all",
  stamp_added: "filters.stampAdded",
  reward_redeemed: "filters.rewardRedeemed",
  stamp_voided: "filters.stampVoided",
  bonus_stamp: "filters.bonusStamp",
  stamps_adjusted: "filters.stampsAdjusted",
};

const FILTER_COLORS: Record<
  TransactionType | "all",
  { color: string; bg: string }
> = {
  all: { color: "var(--accent)", bg: "var(--accent-light)" },
  stamp_added: { color: "var(--accent)", bg: "var(--accent-light)" },
  stamp_voided: { color: "#C75050", bg: "#FDE8E4" },
  reward_redeemed: { color: "#C4883D", bg: "#FFF3E0" },
  bonus_stamp: { color: "#3D7CAF", bg: "#E4F0F8" },
  stamps_adjusted: { color: "#8A8A8A", bg: "#F0EDE7" },
};

interface ActivityFiltersProps {
  selected: TransactionType | "all";
  onSelect: (filter: TransactionType | "all") => void;
}

export function ActivityFilters({ selected, onSelect }: ActivityFiltersProps) {
  const t = useTranslations("activity");

  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTER_OPTIONS.map((filter) => {
        const colors = FILTER_COLORS[filter];
        return (
          <FilterPill
            key={filter}
            label={t(FILTER_LABEL_KEYS[filter])}
            isActive={selected === filter}
            onClick={() => onSelect(filter)}
            activeColor={colors.color}
            activeBg={colors.bg}
          />
        );
      })}
    </div>
  );
}

export function ActivityFiltersSkeleton() {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-7 rounded-full bg-[var(--muted)] animate-pulse"
          style={{ width: `${60 + i * 12}px` }}
        />
      ))}
    </div>
  );
}
