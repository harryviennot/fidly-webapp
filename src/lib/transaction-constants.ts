import {
  StampIcon,
  GiftIcon,
  ProhibitIcon,
  StarIcon,
  SlidersHorizontalIcon,
  CreditCardIcon,
} from "@phosphor-icons/react";
import type { TransactionType } from "@/types";

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
  bonus_stamp: {
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
