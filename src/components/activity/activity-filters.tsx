"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
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

interface ActivityFiltersProps {
  selected: TransactionType | "all";
  onSelect: (filter: TransactionType | "all") => void;
}

export function ActivityFilters({ selected, onSelect }: ActivityFiltersProps) {
  const t = useTranslations("activity");

  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map((filter) => {
        const isActive = selected === filter;
        return (
          <button
            key={filter}
            onClick={() => onSelect(filter)}
            className={cn(
              "inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 border",
              isActive
                ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                : "bg-[var(--cream)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--accent-muted)]/50 hover:text-[var(--accent)]"
            )}
          >
            {t(FILTER_LABEL_KEYS[filter])}
          </button>
        );
      })}
    </div>
  );
}

export function ActivityFiltersSkeleton() {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-8 rounded-lg bg-[var(--muted)] animate-pulse"
          style={{ width: `${60 + i * 15}px` }}
        />
      ))}
    </div>
  );
}
