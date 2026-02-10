"use client";

import { useTranslations } from "next-intl";
import {
  StampIcon,
  GiftIcon,
  ProhibitIcon,
  StarIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import { StampIconSvg, type StampIconType } from "@/components/design/StampIconPicker";
import type { TransactionResponse, TransactionType } from "@/types";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  TransactionType,
  { icon: typeof StampIcon; iconColor: string; bgColor: string }
> = {
  stamp_added: {
    icon: StampIcon,
    iconColor: "text-[var(--accent)]",
    bgColor: "bg-[var(--accent-light)]",
  },
  reward_redeemed: {
    icon: GiftIcon,
    iconColor: "text-[var(--stamp-sand)]",
    bgColor: "bg-[var(--accent-light)]",
  },
  stamp_voided: {
    icon: ProhibitIcon,
    iconColor: "text-[var(--stamp-coral)]",
    bgColor: "bg-[var(--accent-light)]",
  },
  bonus_stamp: {
    icon: StarIcon,
    iconColor: "text-[var(--stamp-sage)]",
    bgColor: "bg-[var(--accent-light)]",
  },
  stamps_adjusted: {
    icon: SlidersHorizontalIcon,
    iconColor: "text-[var(--muted-foreground)]",
    bgColor: "bg-[var(--background-subtle)]",
  },
};

interface TransactionItemProps {
  transaction: TransactionResponse;
  showCustomerName?: boolean;
  isLast?: boolean;
  stampIcon?: string;
  rewardIcon?: string;
  stampFilledColor?: string;
  iconColor?: string;
}

export function TransactionItem({
  transaction,
  showCustomerName,
  isLast,
  stampIcon: designStampIcon,
  rewardIcon: designRewardIcon,
  stampFilledColor,
  iconColor,
}: TransactionItemProps) {
  const t = useTranslations("customers.transaction");
  const config = TYPE_CONFIG[transaction.type];
  const hasDesignIcons = !!designStampIcon;

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t("time.justNow");
    if (diffMins < 60) return t("time.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("time.hoursAgo", { count: diffHours });
    if (diffDays === 1) return t("time.yesterday");
    if (diffDays < 7) return t("time.daysAgo", { count: diffDays });
    return date.toLocaleDateString();
  };

  const deltaText =
    transaction.stamp_delta > 0
      ? `+${transaction.stamp_delta}`
      : String(transaction.stamp_delta);

  const metadata = transaction.metadata as Record<string, string> | null;

  // Determine icon rendering based on transaction type + design availability
  const renderIcon = () => {
    const type = transaction.type;

    if (hasDesignIcons && (type === "stamp_added" || type === "bonus_stamp")) {
      return (
        <div
          className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
          style={{ backgroundColor: stampFilledColor }}
        >
          <StampIconSvg
            icon={designStampIcon as StampIconType}
            className="w-5 h-5"
            color={iconColor}
          />
        </div>
      );
    }

    if (hasDesignIcons && type === "reward_redeemed") {
      return (
        <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 bg-emerald-500/15">
          <StampIconSvg
            icon={(designRewardIcon as StampIconType) ?? "gift"}
            className="w-5 h-5"
            color="#10b981"
          />
        </div>
      );
    }

    if (hasDesignIcons && type === "stamp_voided") {
      return (
        <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 bg-red-500/15">
          <StampIconSvg
            icon={designStampIcon as StampIconType}
            className="w-5 h-5"
            color="#ef4444"
          />
        </div>
      );
    }

    // Default: stamps_adjusted or no design icons
    const Icon = config.icon;
    return (
      <div
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-full shrink-0",
          config.bgColor
        )}
      >
        <Icon size={16} weight="duotone" className={config.iconColor} />
      </div>
    );
  };

  return (
    <div className="flex gap-3.5 relative">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        {renderIcon()}
        {!isLast && <div className="w-px flex-1 bg-[var(--border-light)]" />}
      </div>

      {/* Content */}
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            {t(`types.${transaction.type}`)}
          </span>
          <span
            className={cn(
              "text-xs font-semibold tabular-nums",
              transaction.stamp_delta > 0
                ? "text-[var(--accent)]"
                : transaction.stamp_delta < 0
                  ? "text-[var(--stamp-coral)]"
                  : "text-[var(--muted-foreground)]"
            )}
          >
            {deltaText}
          </span>
        </div>

        {showCustomerName && metadata?.customer_name && (
          <p className="text-sm text-[var(--foreground)] mt-0.5">
            {metadata.customer_name}
          </p>
        )}

        {metadata?.reason && (
          <p className="text-xs text-[var(--muted-foreground)] mt-1 italic">
            {metadata.reason}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-[var(--muted-foreground)]">
            {formatRelativeTime(transaction.created_at)}
          </span>
          <span className="text-[var(--border)]">&middot;</span>
          <span className="text-xs text-[var(--muted-foreground)] tabular-nums">
            {transaction.stamps_before} &rarr; {transaction.stamps_after}
          </span>
          <span className="text-[var(--border)]">&middot;</span>
          <span className="text-xs text-[var(--muted-foreground)]">
            {transaction.source}
          </span>
        </div>
      </div>
    </div>
  );
}
