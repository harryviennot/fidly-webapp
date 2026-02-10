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
  { icon: typeof StampIcon; color: string; bgColor: string; borderColor: string }
> = {
  stamp_added: {
    icon: StampIcon,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-l-green-500",
  },
  reward_redeemed: {
    icon: GiftIcon,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-l-amber-500",
  },
  stamp_voided: {
    icon: ProhibitIcon,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-l-red-500",
  },
  bonus_stamp: {
    icon: StarIcon,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-l-blue-500",
  },
  stamps_adjusted: {
    icon: SlidersHorizontalIcon,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-l-purple-500",
  },
};

interface ActivityItemProps {
  transaction: TransactionResponse;
}

export function ActivityItem({ transaction }: ActivityItemProps) {
  const t = useTranslations("activity");
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

  const metadata = transaction.metadata as Record<string, string> | null;
  const customerName = metadata?.customer_name || transaction.customer_id.slice(0, 8);

  const deltaText =
    transaction.stamp_delta > 0
      ? `+${transaction.stamp_delta}`
      : String(transaction.stamp_delta);

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--cream)] border-l-4 transition-all duration-200",
        config.borderColor
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-full shrink-0",
          config.bgColor
        )}
      >
        <Icon size={18} weight="fill" className={config.color} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[var(--foreground)]">
            {customerName}
          </span>
          <span className="text-sm text-[var(--muted-foreground)]">
            {t(`itemVerbs.${transaction.type}`)}
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
        </div>

        {metadata?.reason && (
          <p className="text-xs text-[var(--muted-foreground)] mt-1 italic">
            {metadata.reason}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-[var(--muted-foreground)]">
            {formatRelativeTime(transaction.created_at)}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {transaction.source}
          </Badge>
          {metadata?.employee_name && (
            <span className="text-xs text-[var(--muted-foreground)]">
              {t("by")} {metadata.employee_name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--cream)] border-l-4 border-l-[var(--muted)]">
      <div className="w-9 h-9 rounded-full bg-[var(--muted)] animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 bg-[var(--muted)] rounded animate-pulse" />
        <div className="h-3 w-24 bg-[var(--muted)] rounded animate-pulse" />
      </div>
    </div>
  );
}
