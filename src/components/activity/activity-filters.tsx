"use client";

import { useTranslations } from "next-intl";
import type { SingleSelectFilterGroup } from "@/components/reusables/search-bar";
import type { TransactionType } from "@/types";

// balance_migrated is deliberately not filterable: the backend hides it from
// the business-wide feed (the activity page shows ONE conversion marker
// instead), so a chip for it would always come back empty.
type FilterKey =
  | Exclude<TransactionType, "balance_migrated">
  | "all"
  | "card_added,card_re_added";

const FILTER_OPTIONS: FilterKey[] = [
  "all",
  "stamp_added",
  "points_earned",
  "reward_redeemed",
  "stamp_voided",
  "points_voided",
  "bonus_stamp",
  "bonus_points",
  "stamps_adjusted",
  "points_adjusted",
  "card_added,card_re_added",
  "card_deleted",
];

const FILTER_LABEL_KEYS: Record<FilterKey, string> = {
  all: "filters.all",
  stamp_added: "filters.stampAdded",
  points_earned: "filters.pointsEarned",
  reward_redeemed: "filters.rewardRedeemed",
  stamp_voided: "filters.stampVoided",
  points_voided: "filters.pointsVoided",
  bonus_stamp: "filters.bonusStamp",
  bonus_points: "filters.bonusPoints",
  stamps_adjusted: "filters.stampsAdjusted",
  points_adjusted: "filters.pointsAdjusted",
  "card_added,card_re_added": "filters.cardAdded",
  card_added: "filters.cardAdded",
  card_re_added: "filters.cardReAdded",
  card_deleted: "filters.cardDeleted",
};

const FILTER_COLORS: Record<FilterKey, { color: string; bg: string }> = {
  all: { color: "var(--accent)", bg: "var(--accent-light)" },
  stamp_added: { color: "var(--accent)", bg: "var(--accent-light)" },
  points_earned: { color: "var(--accent)", bg: "var(--accent-light)" },
  stamp_voided: { color: "#C75050", bg: "#FDE8E4" },
  points_voided: { color: "#C75050", bg: "#FDE8E4" },
  reward_redeemed: { color: "#C4883D", bg: "#FFF3E0" },
  bonus_stamp: { color: "#3D7CAF", bg: "#E4F0F8" },
  bonus_points: { color: "#3D7CAF", bg: "#E4F0F8" },
  stamps_adjusted: { color: "#8A8A8A", bg: "#F0EDE7" },
  points_adjusted: { color: "#8A8A8A", bg: "#F0EDE7" },
  "card_added,card_re_added": { color: "#4A7C59", bg: "#E8F5E4" },
  card_added: { color: "#4A7C59", bg: "#E8F5E4" },
  card_re_added: { color: "#4A7C59", bg: "#E8F5E4" },
  card_deleted: { color: "#C75050", bg: "#FDE8E4" },
};

export type { FilterKey };

/**
 * Builds the activity "type" `FilterGroup` for `<SearchBar filters={[...]}>`.
 * Renders as a color-dot dropdown (8 options > the pill threshold). The "all"
 * option carries no color so the reset row has no dot.
 */
export function useActivityTypeFilterGroup(
  selected: FilterKey,
  onSelect: (filter: FilterKey) => void
): SingleSelectFilterGroup {
  const t = useTranslations("activity");

  return {
    id: "type",
    label: t("filters.label"),
    value: selected === "all" ? null : selected,
    allValue: "all",
    onChange: (v) => onSelect((v ?? "all") as FilterKey),
    options: FILTER_OPTIONS.map((filter) => ({
      value: filter,
      label: t(FILTER_LABEL_KEYS[filter]),
      ...(filter === "all"
        ? {}
        : { color: FILTER_COLORS[filter].color, activeBg: FILTER_COLORS[filter].bg }),
    })),
  };
}
