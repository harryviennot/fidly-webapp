"use client";

import { useTranslations } from "next-intl";
import type { TransactionResponse } from "@/types";
import { useAuth } from "@/contexts/auth-provider";
import { cn } from "@/lib/utils";
import { TYPE_CONFIG, isCardLifecycleType } from "@/lib/transaction-constants";
import { TransactionIcon } from "@/components/activity/transaction-icon";

interface ActivityItemProps {
  transaction: TransactionResponse;
  totalStamps?: number;
  onClick?: () => void;
  isNew?: boolean;
  isLast?: boolean;
  stampIcon?: string;
  rewardIcon?: string;
  stampFilledColor?: string;
  iconColor?: string;
}

export function ActivityItem({
  transaction,
  totalStamps,
  onClick,
  isNew,
  isLast,
  stampIcon: designStampIcon,
  rewardIcon: designRewardIcon,
  stampFilledColor,
  iconColor,
}: ActivityItemProps) {
  const t = useTranslations("activity");
  const { user } = useAuth();
  const config = TYPE_CONFIG[transaction.type];

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
  const rawName = metadata?.customer_name;
  const isGenericName = !rawName || rawName.toLowerCase() === "customer";
  const customerLabel = isGenericName
    ? (metadata?.customer_email && !metadata.customer_email.includes("@placeholder.local")
        ? metadata.customer_email
        : transaction.customer_id.slice(0, 8))
    : rawName;

  const deltaText =
    transaction.stamp_delta > 0
      ? `+${transaction.stamp_delta}`
      : String(transaction.stamp_delta);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex gap-3 relative",
        onClick && "cursor-pointer",
        isNew && "animate-[slide-in-top_0.3s_ease-out]"
      )}
    >
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
        <div
          className={cn(
            "rounded-xl bg-[#FAFAF8] border border-[#F0EFEB] px-4 py-3 transition-all duration-150",
            onClick && "hover:bg-[#F5F3EF] hover:border-[#E8E5DE]"
          )}
        >
          {/* Top row: customer name + verb + delta + time */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-semibold text-[#1A1A1A]">
                {customerLabel}
              </span>
              <span className="text-[13px] text-[#666] ml-1.5">
                {t(`itemVerbs.${transaction.type}`)}
              </span>
              {!isCardLifecycleType(transaction.type) && (
                <span
                  className={cn(
                    "text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-[5px] shrink-0 ml-1 inline-block",
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

          {/* Bottom row: stamp transition · total · source · employee */}
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
                {totalStamps != null && totalStamps > 0 && (
                  <>
                    <span className="text-[#D8D5CE]">·</span>
                    <span>
                      {t("stampProgress", {
                        current: transaction.stamps_after,
                        total: totalStamps,
                      })}
                    </span>
                  </>
                )}
                <span className="text-[#D8D5CE]">·</span>
                <span>{transaction.source}</span>
              </>
            )}
            {transaction.employee_name && (
              <>
                <span className="text-[#D8D5CE]">·</span>
                <span>
                  {t("by")} {transaction.employee_id === user?.id ? t("you") : transaction.employee_name}
                </span>
              </>
            )}
          </div>

          {/* Void reason */}
          {metadata?.void_reason && (
            <p className="text-[11px] text-[#8A8A8A] mt-1.5 italic">
              {metadata.void_reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActivityItemSkeleton() {
  return (
    <div className="flex gap-3 relative">
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-[var(--muted)] animate-pulse shrink-0" />
        <div className="w-[1.5px] flex-1 bg-[#E8E5DE]" />
      </div>
      <div className="pb-1.5 flex-1 min-w-0 -mt-0.5">
        <div className="rounded-xl bg-[#FAFAF8] border border-[#F0EFEB] px-4 py-3">
          <div className="h-4 w-48 bg-[var(--muted)] rounded animate-pulse" />
          <div className="h-3 w-32 bg-[var(--muted)] rounded animate-pulse mt-2" />
        </div>
      </div>
    </div>
  );
}
