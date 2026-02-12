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
  stampIcon?: string;
  rewardIcon?: string;
  stampFilledColor?: string;
  iconColor?: string;
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
  stampIcon,
  rewardIcon,
  stampFilledColor,
  iconColor,
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
    <div>
      {Array.from(grouped.entries()).map(([group, items]) => (
        <div key={group}>
          <ActivityDateGroupHeader group={group} />
          <div>
            {items.map((txn, i) => (
              <ActivityItem
                key={txn.id}
                transaction={txn}
                totalStamps={totalStamps}
                onClick={onItemClick ? () => onItemClick(txn) : undefined}
                isNew={newTransactionIds?.has(txn.id)}
                isLast={i === items.length - 1}
                stampIcon={stampIcon}
                rewardIcon={rewardIcon}
                stampFilledColor={stampFilledColor}
                iconColor={iconColor}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage && (
        <div className="pt-2">
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
    <div>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </div>
  );
}
