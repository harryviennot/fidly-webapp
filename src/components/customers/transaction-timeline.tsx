"use client";

import { useTranslations } from "next-intl";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { TransactionItem } from "./transaction-item";
import type { TransactionResponse } from "@/types";

interface TransactionTimelineProps {
  transactions: TransactionResponse[];
  loading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  showCustomerName?: boolean;
  stampIcon?: string;
  rewardIcon?: string;
  stampFilledColor?: string;
  iconColor?: string;
}

export function TransactionTimeline({
  transactions,
  loading,
  hasMore,
  onLoadMore,
  loadingMore,
  showCustomerName,
  stampIcon,
  rewardIcon,
  stampFilledColor,
  iconColor,
}: TransactionTimelineProps) {
  const t = useTranslations("customers.transaction");

  if (loading) {
    return <TransactionTimelineSkeleton />;
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-10">
        <ClockCounterClockwiseIcon
          size={36}
          weight="duotone"
          className="text-[var(--muted-foreground)] mb-3"
        />
        <p className="text-sm text-[var(--muted-foreground)]">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div>
      {transactions.map((txn, i) => (
        <TransactionItem
          key={txn.id}
          transaction={txn}
          showCustomerName={showCustomerName}
          isLast={i === transactions.length - 1}
          stampIcon={stampIcon}
          rewardIcon={rewardIcon}
          stampFilledColor={stampFilledColor}
          iconColor={iconColor}
        />
      ))}

      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? t("loadingMore") : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

export function TransactionTimelineSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3.5 py-3">
          <div className="w-9 h-9 rounded-full bg-[var(--muted)] animate-pulse shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-36 bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-3 w-24 bg-[var(--muted)] rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
