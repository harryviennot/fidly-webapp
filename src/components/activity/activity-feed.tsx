"use client";

import { useEffect, useRef, useMemo } from "react";
import { ActivityItem, ActivityItemSkeleton } from "./activity-item";
import { ActivityDateGroupHeader, groupByDate } from "./activity-date-group";
import { ActivityEmptyState } from "./activity-empty-state";
import type { TransactionResponse } from "@/types";

interface ActivityFeedProps {
  transactions: TransactionResponse[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  totalStamps?: number;
  onItemClick?: (transaction: TransactionResponse) => void;
  newTransactionIds?: Set<string>;
  hasActiveFilters?: boolean;
}

export function ActivityFeed({
  transactions,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  totalStamps,
  onItemClick,
  newTransactionIds,
  hasActiveFilters,
}: ActivityFeedProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const grouped = useMemo(() => groupByDate(transactions), [transactions]);

  if (isLoading) {
    return <ActivityFeedSkeleton />;
  }

  if (transactions.length === 0) {
    return <ActivityEmptyState filtered={hasActiveFilters} />;
  }

  return (
    <div className="space-y-1">
      {Array.from(grouped.entries()).map(([group, items]) => (
        <div key={group}>
          <ActivityDateGroupHeader group={group} />
          <div className="space-y-3 py-1">
            {items.map((txn) => (
              <ActivityItem
                key={txn.id}
                transaction={txn}
                totalStamps={totalStamps}
                onClick={onItemClick ? () => onItemClick(txn) : undefined}
                isNew={newTransactionIds?.has(txn.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage && (
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <ActivityItemSkeleton key={i} />
          ))}
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
