"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "@/contexts/business-context";
import { useActiveDesign } from "@/hooks/use-designs";
import { useActivityStats, activityKeys } from "@/hooks/use-activity-stats";
import { useActivityFeed } from "@/hooks/use-activity-feed";
import { getCustomer } from "@/api";
import type { TransactionResponse, TransactionType, CustomerResponse } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ActivityStatsBar } from "@/components/activity/activity-stats-bar";
import { ActivityFilters, ActivityFiltersSkeleton } from "@/components/activity/activity-filters";
import { ActivitySearch } from "@/components/activity/activity-search";
import { ActivityFeed, ActivityFeedSkeleton } from "@/components/activity/activity-feed";
import { ActivityLiveIndicator } from "@/components/activity/activity-live-indicator";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";

export default function ActivityPage() {
  const { currentBusiness } = useBusiness();
  const t = useTranslations("activity");
  const queryClient = useQueryClient();
  const businessId = currentBusiness?.id;

  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResponse | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: design } = useActiveDesign(businessId);
  const totalStamps = design?.total_stamps ?? 0;

  const stats = useActivityStats(businessId);

  const feedFilters = useMemo(
    () => ({
      type: typeFilter === "all" ? undefined : typeFilter,
      search: searchQuery || undefined,
    }),
    [typeFilter, searchQuery]
  );

  const feed = useActivityFeed(businessId, feedFilters);

  const transactions = useMemo(
    () => feed.data?.pages.flatMap((p) => p.transactions) ?? [],
    [feed.data]
  );

  // Track latest_transaction_at to auto-refresh feed
  const latestRef = useRef<string | null>(null);
  useEffect(() => {
    const serverLatest = stats.data?.latest_transaction_at;
    if (!serverLatest) return;

    if (latestRef.current && serverLatest > latestRef.current) {
      // New activity detected — refresh the feed
      queryClient.invalidateQueries({
        queryKey: activityKeys.feed(businessId!, feedFilters),
      });
    }
    latestRef.current = serverLatest;
  }, [stats.data?.latest_transaction_at, businessId, feedFilters, queryClient]);

  // Track new transaction IDs for animation
  const prevFirstPageRef = useRef<Set<string>>(new Set());
  const newTransactionIds = useMemo(() => {
    const firstPage = feed.data?.pages[0]?.transactions ?? [];
    const currentIds = new Set(firstPage.map((t) => t.id));
    const newIds = new Set<string>();

    if (prevFirstPageRef.current.size > 0) {
      for (const id of currentIds) {
        if (!prevFirstPageRef.current.has(id)) {
          newIds.add(id);
        }
      }
    }

    prevFirstPageRef.current = currentIds;
    return newIds;
  }, [feed.data?.pages]);

  const hasActiveFilters = typeFilter !== "all" || !!searchQuery;

  const handleItemClick = async (txn: TransactionResponse) => {
    if (!businessId) return;
    try {
      const customer = await queryClient.fetchQuery({
        queryKey: ["customers", businessId, txn.customer_id],
        queryFn: () => getCustomer(businessId, txn.customer_id),
        staleTime: 60_000,
      });
      setSelectedCustomer(customer);
      setSheetOpen(true);
    } catch {
      // Customer may have been deleted
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("title")}</h2>

      <ActivityStatsBar stats={stats.data} isLoading={stats.isLoading} />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ActivityLiveIndicator />
            </div>
            <div className="w-64">
              <ActivitySearch value={searchQuery} onChange={setSearchQuery} />
            </div>
          </div>
          <div className="pt-3">
            {feed.isLoading ? (
              <ActivityFiltersSkeleton />
            ) : (
              <ActivityFilters selected={typeFilter} onSelect={setTypeFilter} />
            )}
          </div>
        </CardHeader>

        <CardContent>
          {feed.isLoading ? (
            <ActivityFeedSkeleton />
          ) : (
            <ActivityFeed
              transactions={transactions}
              isLoading={false}
              hasNextPage={feed.hasNextPage}
              isFetchingNextPage={feed.isFetchingNextPage}
              fetchNextPage={feed.fetchNextPage}
              totalStamps={totalStamps}
              onItemClick={handleItemClick}
              newTransactionIds={newTransactionIds}
              hasActiveFilters={hasActiveFilters}
            />
          )}
        </CardContent>
      </Card>

      <CustomerDetailSheet
        customer={selectedCustomer}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        maxStamps={totalStamps}
        design={design ?? undefined}
      />
    </div>
  );
}
