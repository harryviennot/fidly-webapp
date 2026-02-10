"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ActivityItem, ActivityItemSkeleton } from "./activity-item";
import type { TransactionResponse } from "@/types";

interface ActivityFeedProps {
  transactions: TransactionResponse[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}

export function ActivityFeed({
  transactions,
  loading,
  hasMore,
  onLoadMore,
  loadingMore,
}: ActivityFeedProps) {
  const t = useTranslations("activity");

  if (loading) {
    return <ActivityFeedSkeleton />;
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-12">
        <p className="text-[var(--muted-foreground)]">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((txn) => (
        <ActivityItem key={txn.id} transaction={txn} />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
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

export function ActivityFeedSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </div>
  );
}
