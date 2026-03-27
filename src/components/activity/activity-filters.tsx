"use client";

import { useTranslations } from "next-intl";
import { FilterPill } from "@/components/reusables/filter-pill";
import type { TransactionType } from "@/types";

type FilterKey = TransactionType | "all" | "card_added,card_re_added";

const FILTER_OPTIONS: FilterKey[] = [
  "all",
  "stamp_added",
  "reward_redeemed",
  "stamp_voided",
  "bonus_stamp",
  "stamps_adjusted",
  "card_added,card_re_added",
  "card_deleted",
];

const FILTER_LABEL_KEYS: Record<FilterKey, string> = {
  all: "filters.all",
  stamp_added: "filters.stampAdded",
  reward_redeemed: "filters.rewardRedeemed",
  stamp_voided: "filters.stampVoided",
  bonus_stamp: "filters.bonusStamp",
  stamps_adjusted: "filters.stampsAdjusted",
  "card_added,card_re_added": "filters.cardAdded",
  card_added: "filters.cardAdded",
  card_re_added: "filters.cardReAdded",
  card_deleted: "filters.cardDeleted",
};

const FILTER_COLORS: Record<FilterKey, { color: string; bg: string }> = {
  all: { color: "var(--accent)", bg: "var(--accent-light)" },
  stamp_added: { color: "var(--accent)", bg: "var(--accent-light)" },
  stamp_voided: { color: "#C75050", bg: "#FDE8E4" },
  reward_redeemed: { color: "#C4883D", bg: "#FFF3E0" },
  bonus_stamp: { color: "#3D7CAF", bg: "#E4F0F8" },
  stamps_adjusted: { color: "#8A8A8A", bg: "#F0EDE7" },
  "card_added,card_re_added": { color: "#4A7C59", bg: "#E8F5E4" },
  card_added: { color: "#4A7C59", bg: "#E8F5E4" },
  card_re_added: { color: "#4A7C59", bg: "#E8F5E4" },
  card_deleted: { color: "#C75050", bg: "#FDE8E4" },
};

export type { FilterKey };

interface ActivityFiltersProps {
  selected: FilterKey;
  onSelect: (filter: FilterKey) => void;
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
