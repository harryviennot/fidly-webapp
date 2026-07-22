"use client";

import { useEffect, useRef, useMemo } from "react";
import { ActivityItem, ActivityItemSkeleton } from "./activity-item";
import { ActivityDateGroupHeader, groupByDate } from "./activity-date-group";
import { ActivityEmptyState } from "./activity-empty-state";
import { ConversionMarker } from "./conversion-marker";
import type { ProgramConversion, TransactionResponse } from "@/types";

/** A feed row: a customer transaction, or a business-level conversion marker
 * interleaved at its completion date. */
type FeedEntry =
  | { kind: "txn"; id: string; created_at: string; txn: TransactionResponse }
  | { kind: "conversion"; id: string; created_at: string; conversion: ProgramConversion };

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
  /** Completed program-type conversions, rendered as one marker row each. */
  conversions?: ProgramConversion[];
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
  conversions,
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

  const grouped = useMemo(() => {
    const entries: FeedEntry[] = transactions.map((txn) => ({
      kind: "txn" as const,
      id: txn.id,
      created_at: txn.created_at,
      txn,
    }));
    // Interleave completed conversion markers at their completion date, but
    // only inside the loaded window: a marker older than the oldest loaded
    // transaction would render in the wrong group until pagination reaches it.
    const oldestLoaded = transactions[transactions.length - 1]?.created_at;
    for (const conversion of conversions ?? []) {
      if (conversion.status !== "completed") continue;
      const when = conversion.completed_at ?? conversion.created_at;
      if (oldestLoaded && when < oldestLoaded && hasNextPage) continue;
      entries.push({ kind: "conversion", id: conversion.id, created_at: when, conversion });
    }
    entries.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return groupByDate(entries);
  }, [transactions, conversions, hasNextPage]);

  if (isLoading) {
    return <ActivityFeedSkeleton />;
  }

  if (transactions.length === 0 && !(conversions ?? []).length) {
    return <ActivityEmptyState filtered={hasActiveFilters} />;
  }

  return (
    <div>
      {Array.from(grouped.entries()).map(([group, items]) => (
        <div key={group}>
          <ActivityDateGroupHeader group={group} />
          <div>
            {items.map((entry, i) =>
              entry.kind === "conversion" ? (
                <ConversionMarker key={entry.id} conversion={entry.conversion} />
              ) : (
                <ActivityItem
                  key={entry.id}
                  transaction={entry.txn}
                  totalStamps={totalStamps}
                  onClick={onItemClick ? () => onItemClick(entry.txn) : undefined}
                  isNew={newTransactionIds?.has(entry.id)}
                  isLast={i === items.length - 1}
                  stampIcon={stampIcon}
                  rewardIcon={rewardIcon}
                  stampFilledColor={stampFilledColor}
                  iconColor={iconColor}
                />
              )
            )}
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
