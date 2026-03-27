"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { TransactionResponse } from "@/types";
import { cn } from "@/lib/utils";
import { TYPE_CONFIG, isCardLifecycleType } from "@/lib/transaction-constants";
import { TransactionIcon } from "@/components/activity/transaction-icon";

interface TransactionItemProps {
  transaction: TransactionResponse;
  currentUserId?: string;
  showCustomerName?: boolean;
  isLast?: boolean;
  stampIcon?: string;
  rewardIcon?: string;
  stampFilledColor?: string;
  iconColor?: string;
}

export function TransactionItem({
  transaction,
  currentUserId,
  showCustomerName,
  isLast,
  stampIcon: designStampIcon,
  rewardIcon: designRewardIcon,
  stampFilledColor,
  iconColor,
}: TransactionItemProps) {
  const t = useTranslations("customers.transaction");
  const config = TYPE_CONFIG[transaction.type];
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

  return (
    <div className="flex gap-3 relative">
      {/* Timeline dot + connecting line */}
      <div className="flex flex-col items-center">
        <TransactionIcon
          type={transaction.type}
          config={config}
          size="md"
          designStampIcon={designStampIcon}
          designRewardIcon={designRewardIcon}
          stampFilledColor={stampFilledColor}
          iconColor={iconColor}
        />
        {!isLast && <div className="w-[1.5px] flex-1 bg-[#E8E5DE]" />}
      </div>

      {/* Content card */}
      <div className="pb-1.5 flex-1 min-w-0 -mt-0.5">
        <div className="rounded-xl bg-[#FAFAF8] border border-[#F0EFEB] px-4 py-3">
          {/* Top row: type + delta + time */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-semibold text-[#1A1A1A]">
                {t(`types.${transaction.type}`)}
              </span>
              {!isCardLifecycleType(transaction.type) && (
                <span
                  className={cn(
                    "text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-[5px] shrink-0 ml-1.5 inline-block",
                    config.deltaBg,
                    config.deltaText
                  )}
                >
                  {deltaText}
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#B0B0B0] tabular-nums shrink-0 mt-0.5">
              {formatRelativeTime(transaction.created_at)}
            </span>
          </div>

          {showCustomerName && metadata?.customer_name && (
            <p className="text-[12px] text-[#555] mb-1">
              {metadata.customer_name}
            </p>
          )}

          {/* Bottom row: stamp transition · source · employee */}
          <div className="flex items-center gap-1.5 flex-wrap text-[12px] text-[#8A8A8A]">
            {isCardLifecycleType(transaction.type) ? (
              <span className="capitalize">
                {metadata?.wallet_type === "google" ? "Google Wallet" : "Apple Wallet"}
              </span>
            ) : (
              <>
                <span className="font-semibold text-[#555] tabular-nums">
                  {transaction.stamps_before}
                </span>
                <span>→</span>
                <span className="font-semibold tabular-nums text-[#555]">
                  {transaction.stamps_after}
                </span>
                <span className="text-[#D8D5CE]">·</span>
                <span>{transaction.source}</span>
              </>
            )}
            {transaction.employee_name && (
              <>
                <span className="text-[#D8D5CE]">·</span>
                <span>
                  {t("by")} {transaction.employee_id === currentUserId ? t("you") : transaction.employee_name}
                </span>
              </>
            )}
          </div>

          {/* Expandable void reason */}
          {metadata?.void_reason && (
            <button
              type="button"
              onClick={() => setReasonExpanded(!reasonExpanded)}
              className={cn(
                "text-[11px] text-[#8A8A8A] mt-1.5 italic text-left w-full transition-colors hover:text-[#1A1A1A]",
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
