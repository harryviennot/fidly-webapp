"use client";

import { useState } from "react";
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
  {
    icon: typeof StampIcon;
    iconColor: string;
    bgColor: string;
    deltaBg: string;
    deltaText: string;
  }
> = {
  stamp_added: {
    icon: StampIcon,
    iconColor: "text-[var(--accent)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-emerald-50",
    deltaText: "text-emerald-700",
  },
  reward_redeemed: {
    icon: GiftIcon,
    iconColor: "text-[var(--stamp-sand)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-amber-50",
    deltaText: "text-amber-700",
  },
  stamp_voided: {
    icon: ProhibitIcon,
    iconColor: "text-[var(--stamp-coral)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-red-50",
    deltaText: "text-red-600",
  },
  bonus_stamp: {
    icon: StarIcon,
    iconColor: "text-[var(--stamp-sage)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-blue-50",
    deltaText: "text-blue-700",
  },
  stamps_adjusted: {
    icon: SlidersHorizontalIcon,
    iconColor: "text-[var(--muted-foreground)]",
    bgColor: "bg-[var(--background-subtle)]",
    deltaBg: "bg-[var(--background-subtle)]",
    deltaText: "text-[var(--muted-foreground)]",
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
  const [reasonExpanded, setReasonExpanded] = useState(false);

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

  const renderIcon = () => {
    const type = transaction.type;

    if (hasDesignIcons && (type === "stamp_added" || type === "bonus_stamp")) {
      return (
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
          style={{ backgroundColor: stampFilledColor }}
        >
          <StampIconSvg
            icon={designStampIcon as StampIconType}
            className="w-4.5 h-4.5"
            color={iconColor}
          />
        </div>
      );
    }

    if (hasDesignIcons && type === "reward_redeemed") {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-emerald-500/15">
          <StampIconSvg
            icon={(designRewardIcon as StampIconType) ?? "gift"}
            className="w-4.5 h-4.5"
            color="#10b981"
          />
        </div>
      );
    }

    if (hasDesignIcons && type === "stamp_voided") {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-red-500/15">
          <StampIconSvg
            icon={designStampIcon as StampIconType}
            className="w-4.5 h-4.5"
            color="#ef4444"
          />
        </div>
      );
    }

    const Icon = config.icon;
    return (
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
          config.bgColor
        )}
      >
        <Icon size={15} weight="duotone" className={config.iconColor} />
      </div>
    );
  };

  return (
    <div className="flex gap-3 relative">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        {renderIcon()}
        {!isLast && <div className="w-px flex-1 bg-[var(--border-light)]" />}
      </div>

      {/* Content card */}
      <div className="pb-3 flex-1 min-w-0 -mt-0.5">
        <div className="rounded-xl bg-[var(--background-subtle)]/60 px-3.5 py-2.5">
          {/* Top row: type + time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-medium text-[var(--foreground)] truncate">
                {t(`types.${transaction.type}`)}
              </span>
              <span
                className={cn(
                  "text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full shrink-0",
                  config.deltaBg,
                  config.deltaText
                )}
              >
                {deltaText}
              </span>
            </div>
            <span className="text-[11px] text-[var(--muted-foreground)] tabular-nums shrink-0">
              {formatRelativeTime(transaction.created_at)}
            </span>
          </div>

          {showCustomerName && metadata?.customer_name && (
            <p className="text-xs text-[var(--foreground)] mt-1">
              {metadata.customer_name}
            </p>
          )}

          {/* Bottom row: stamp transition + source */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
              {transaction.stamps_before} &rarr; {transaction.stamps_after}
            </span>
            <span className="text-[var(--border)] text-[10px]">&middot;</span>
            <span className="text-[11px] text-[var(--muted-foreground)]">
              {transaction.source}
            </span>
          </div>

          {/* Expandable void reason */}
          {metadata?.void_reason && (
            <button
              type="button"
              onClick={() => setReasonExpanded(!reasonExpanded)}
              className={cn(
                "text-[11px] text-[var(--muted-foreground)] mt-1.5 italic text-left w-full transition-colors hover:text-[var(--foreground)]",
                !reasonExpanded && "line-clamp-1"
              )}
            >
              {t("voidReason")}: {metadata.void_reason}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
