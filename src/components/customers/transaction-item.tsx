"use client";

import { useTranslations } from "next-intl";
import {
  StampIcon,
  GiftIcon,
  ProhibitIcon,
  StarIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import type { TransactionResponse, TransactionType } from "@/types";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  TransactionType,
  { icon: typeof StampIcon; color: string; bgColor: string }
> = {
  stamp_added: {
    icon: StampIcon,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  reward_redeemed: {
    icon: GiftIcon,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  stamp_voided: {
    icon: ProhibitIcon,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  bonus_stamp: {
    icon: StarIcon,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  stamps_adjusted: {
    icon: SlidersHorizontalIcon,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
};

interface TransactionItemProps {
  transaction: TransactionResponse;
  showCustomerName?: boolean;
}

export function TransactionItem({ transaction, showCustomerName }: TransactionItemProps) {
  const t = useTranslations("customers.transaction");
  const config = TYPE_CONFIG[transaction.type];
  const Icon = config.icon;

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

  return (
    <div className="flex gap-3 relative">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
            config.bgColor
          )}
        >
          <Icon size={16} weight="fill" className={config.color} />
        </div>
        <div className="w-px flex-1 bg-[var(--border)] mt-1" />
      </div>

      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[var(--foreground)]">
            {t(`types.${transaction.type}`)}
          </span>
          <span
            className={cn(
              "text-xs font-semibold px-1.5 py-0.5 rounded",
              transaction.stamp_delta > 0
                ? "bg-green-50 text-green-700"
                : transaction.stamp_delta < 0
                  ? "bg-red-50 text-red-700"
                  : "bg-gray-50 text-gray-700"
            )}
          >
            {deltaText}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            {transaction.stamps_before} → {transaction.stamps_after}
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

        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-[var(--muted-foreground)]">
            {formatRelativeTime(transaction.created_at)}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {transaction.source}
          </Badge>
        </div>
      </div>
    </div>
  );
}
