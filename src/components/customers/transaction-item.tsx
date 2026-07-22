"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { TransactionResponse } from "@/types";
import { useEntitlements } from "@/hooks/useEntitlements";
import { cn } from "@/lib/utils";
import {
  TYPE_CONFIG,
  isCardLifecycleType,
  isPointsTransaction,
  txDelta,
  txValueAfter,
  txValueBefore,
} from "@/lib/transaction-constants";
import { describeMigration } from "@/lib/conversion";
import { TransactionIcon } from "@/components/activity/transaction-icon";
import { LocationBadge } from "@/components/locations/location-badge";

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
  const { hasFeature } = useEntitlements();
  const config = TYPE_CONFIG[transaction.type];
  const [reasonExpanded, setReasonExpanded] = useState(false);
  const showLocation =
    hasFeature("locations.multiple") && !!transaction.location_name;

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

  const delta = txDelta(transaction);
  const deltaText = delta > 0 ? `+${delta}` : String(delta);

  // Program-type conversion event: before/after are in DIFFERENT units, so the
  // usual delta chip and "X → Y" row would lie. Render from metadata instead.
  const migration =
    transaction.type === "balance_migrated"
      ? describeMigration(transaction.metadata)
      : null;

  const metadata = transaction.metadata as Record<string, string> | null;
  const isAdjustment =
    transaction.source === "dashboard" &&
    (transaction.type === "stamp_added" ||
      transaction.type === "bonus_stamp" ||
      transaction.type === "points_earned");
  const adjustmentReason = isAdjustment ? metadata?.adjustment_reason : undefined;

  // Map known source values to translated labels; fall back to the raw value
  // so unexpected backend sources still show something.
  const sourceLabel =
    transaction.source === "scanner"
      ? t("sources.scanner")
      : transaction.source === "dashboard"
        ? t("sources.dashboard")
        : transaction.source;

  // Stackable rewards: remaining banked count recorded on redemptions. Banked
  // rewards are a stamp concept; points redemptions spend the balance directly
  // (no "rewards remaining"), so never show the count for points.
  const rewardsLeft =
    transaction.type === "reward_redeemed" &&
    !isPointsTransaction(transaction) &&
    metadata?.rewards_after != null
      ? Number(metadata.rewards_after)
      : null;

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
              {!isCardLifecycleType(transaction.type) && !migration && (
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
            {migration ? (
              <>
                <span className="font-semibold text-[#555] tabular-nums">
                  {t(
                    migration.unitBefore === "point"
                      ? "conversion.pointsValue"
                      : "conversion.stampsValue",
                    { count: migration.valueBefore }
                  )}
                </span>
                <span>→</span>
                <span className="font-semibold text-[#555] tabular-nums">
                  {t(
                    migration.unitAfter === "point"
                      ? "conversion.pointsValue"
                      : "conversion.stampsValue",
                    { count: migration.valueAfter }
                  )}
                </span>
                {(migration.bankedHonored > 0 || migration.bankedCards > 0) && (
                  <>
                    <span className="text-[#D8D5CE]">·</span>
                    <span className="font-semibold text-[var(--warning)]">
                      {t("conversion.rewardsHonored", {
                        count: migration.bankedHonored || migration.bankedCards,
                      })}
                    </span>
                  </>
                )}
              </>
            ) : isCardLifecycleType(transaction.type) ? (
              <span className="capitalize">
                {metadata?.wallet_type === "google" ? "Google Wallet" : "Apple Wallet"}
              </span>
            ) : (
              <>
                <span className="font-semibold text-[#555] tabular-nums">
                  {txValueBefore(transaction)}
                </span>
                <span>→</span>
                <span className="font-semibold tabular-nums text-[#555]">
                  {txValueAfter(transaction)}
                </span>
                <span className="text-[#D8D5CE]">·</span>
                <span>{sourceLabel}</span>
                {rewardsLeft != null && (
                  <>
                    <span className="text-[#D8D5CE]">·</span>
                    <span className="font-semibold text-[var(--warning)]">
                      {t("rewardsLeft", { count: rewardsLeft })}
                    </span>
                  </>
                )}
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
            {showLocation && (
              <>
                <span className="text-[#D8D5CE]">·</span>
                <LocationBadge
                  name={transaction.location_name!}
                  variant="subtle"
                />
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

          {/* Expandable adjustment reason (dashboard-source stamps) */}
          {adjustmentReason && (
            <button
              type="button"
              onClick={() => setReasonExpanded(!reasonExpanded)}
              className={cn(
                "text-[11px] text-[#8A8A8A] mt-1.5 italic text-left w-full transition-colors hover:text-[#1A1A1A]",
                !reasonExpanded && "line-clamp-1"
              )}
            >
              {t("adjustmentReason")}: {adjustmentReason}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
