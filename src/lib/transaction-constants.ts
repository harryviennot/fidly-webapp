import {
  StampIcon,
  GiftIcon,
  ProhibitIcon,
  StarIcon,
  SlidersHorizontalIcon,
  CreditCardIcon,
  CoinsIcon,
} from "@phosphor-icons/react";
import type { TransactionResponse, TransactionType } from "@/types";

export interface TransactionTypeConfig {
  icon: typeof StampIcon;
  iconColor: string;
  bgColor: string;
  deltaBg: string;
  deltaText: string;
}

export const TYPE_CONFIG: Record<TransactionType, TransactionTypeConfig> = {
  stamp_added: {
    icon: StampIcon,
    iconColor: "text-[var(--accent)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-[#E8F5E4]",
    deltaText: "text-[#4A7C59]",
  },
  points_earned: {
    icon: CoinsIcon,
    iconColor: "text-[var(--accent)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-[#E8F5E4]",
    deltaText: "text-[#4A7C59]",
  },
  reward_redeemed: {
    icon: GiftIcon,
    iconColor: "text-[var(--stamp-sand)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-[#E8F5E4]",
    deltaText: "text-[#4A7C59]",
  },
  stamp_voided: {
    icon: ProhibitIcon,
    iconColor: "text-[var(--stamp-coral)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-[#FDE8E4]",
    deltaText: "text-[#C75050]",
  },
  points_voided: {
    icon: ProhibitIcon,
    iconColor: "text-[var(--stamp-coral)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-[#FDE8E4]",
    deltaText: "text-[#C75050]",
  },
  bonus_stamp: {
    icon: StarIcon,
    iconColor: "text-[var(--stamp-sage)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-[#E4F0F8]",
    deltaText: "text-[#3D7CAF]",
  },
  bonus_points: {
    icon: StarIcon,
    iconColor: "text-[var(--stamp-sage)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-[#E4F0F8]",
    deltaText: "text-[#3D7CAF]",
  },
  stamps_adjusted: {
    icon: SlidersHorizontalIcon,
    iconColor: "text-[var(--muted-foreground)]",
    bgColor: "bg-[var(--background-subtle)]",
    deltaBg: "bg-[#F0EDE7]",
    deltaText: "text-[#8A8A8A]",
  },
  points_adjusted: {
    icon: SlidersHorizontalIcon,
    iconColor: "text-[var(--muted-foreground)]",
    bgColor: "bg-[var(--background-subtle)]",
    deltaBg: "bg-[#F0EDE7]",
    deltaText: "text-[#8A8A8A]",
  },
  card_added: {
    icon: CreditCardIcon,
    iconColor: "text-[#4A7C59]",
    bgColor: "bg-[#E8F5E4]",
    deltaBg: "bg-[#E8F5E4]",
    deltaText: "text-[#4A7C59]",
  },
  card_re_added: {
    icon: CreditCardIcon,
    iconColor: "text-[#4A7C59]",
    bgColor: "bg-[#E8F5E4]",
    deltaBg: "bg-[#E8F5E4]",
    deltaText: "text-[#4A7C59]",
  },
  card_deleted: {
    icon: CreditCardIcon,
    iconColor: "text-[#ef4444]",
    bgColor: "bg-red-500/15",
    deltaBg: "bg-[#FDE8E4]",
    deltaText: "text-[#C75050]",
  },
};

const CARD_LIFECYCLE_TYPES: Set<TransactionType> = new Set([
  "card_added",
  "card_re_added",
  "card_deleted",
]);

export function isCardLifecycleType(type: TransactionType): boolean {
  return CARD_LIFECYCLE_TYPES.has(type);
}

/**
 * Read the type-neutral value columns (migration 121), falling back to the
 * legacy stamp-named columns during the backend dual-write window. Use these
 * everywhere instead of `stamp_delta` / `stamps_before` / `stamps_after`.
 */
export function txDelta(t: TransactionResponse): number {
  return t.delta ?? t.stamp_delta ?? 0;
}
export function txValueBefore(t: TransactionResponse): number {
  return t.value_before ?? t.stamps_before ?? 0;
}
export function txValueAfter(t: TransactionResponse): number {
  return t.value_after ?? t.stamps_after ?? 0;
}
/** A points-program transaction (drives the unit shown: "pts" vs stamps). */
export function isPointsTransaction(t: TransactionResponse): boolean {
  return (
    t.program_type === "points" ||
    t.type === "points_earned" ||
    t.type === "points_voided" ||
    t.type === "points_adjusted" ||
    t.type === "bonus_points"
  );
}
