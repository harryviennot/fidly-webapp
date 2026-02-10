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
}

export function TransactionTimeline({
  transactions,
  loading,
  hasMore,
  onLoadMore,
  loadingMore,
  showCustomerName,
}: TransactionTimelineProps) {
  const t = useTranslations("customers.transaction");

  if (loading) {
    return <TransactionTimelineSkeleton />;
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-8">
        <ClockCounterClockwiseIcon
          size={32}
          weight="duotone"
          className="text-[var(--muted-foreground)] mb-2"
        />
        <p className="text-sm text-[var(--muted-foreground)]">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div>
      {transactions.map((txn) => (
        <TransactionItem
          key={txn.id}
          transaction={txn}
          showCustomerName={showCustomerName}
        />
      ))}

      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-2">
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
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--muted)] animate-pulse shrink-0" />
          <div className="flex-1 space-y-2 pb-4">
            <div className="h-4 w-32 bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-3 w-20 bg-[var(--muted)] rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
