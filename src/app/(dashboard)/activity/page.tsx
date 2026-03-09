"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { SearchInput } from "@/components/reusables/search-input";
import { useBusiness } from "@/contexts/business-context";
import { useActiveDesign } from "@/hooks/use-designs";
import { useActivityStats, activityKeys } from "@/hooks/use-activity-stats";
import { useActivityFeed } from "@/hooks/use-activity-feed";
import { getCustomer } from "@/api";
import type { TransactionResponse, TransactionType, CustomerResponse } from "@/types";
import { ActivityStatsBar } from "@/components/activity/activity-stats-bar";
import { ActivityFilters, ActivityFiltersSkeleton } from "@/components/activity/activity-filters";
import { ActivityFeed, ActivityFeedSkeleton } from "@/components/activity/activity-feed";
import { ActivityLiveIndicator } from "@/components/activity/activity-live-indicator";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import { PageHeader } from "@/components/redesign";
import { computeCardColors } from "@/lib/card-utils";
import type { StampIconType } from "@/components/design/StampIconPicker";

export default function ActivityPage() {
  const { currentBusiness } = useBusiness();
  const t = useTranslations("activity");
  const queryClient = useQueryClient();
  const businessId = currentBusiness?.id;

  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResponse | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: design } = useActiveDesign(businessId);
  const totalStamps = design?.total_stamps ?? 0;
  const colors = design ? computeCardColors(design) : null;
  const stampIcon = (design?.stamp_icon as StampIconType) ?? undefined;
  const rewardIcon = (design?.reward_icon as StampIconType) ?? undefined;

  const stats = useActivityStats(businessId);

  const feedFilters = useMemo(
    () => ({
      type: typeFilter === "all" ? undefined : typeFilter,
    }),
    [typeFilter]
  );

  const feed = useActivityFeed(businessId, feedFilters);

  const transactions = useMemo(() => {
    const all = feed.data?.pages.flatMap((p) => p.transactions) ?? [];
    if (!search) return all;
    const term = search.toLowerCase();
    return all.filter((txn) => {
      const meta = txn.metadata as Record<string, string> | null;
      const name = meta?.customer_name?.toLowerCase() ?? "";
      const email = meta?.customer_email?.toLowerCase() ?? "";
      return name.includes(term) || email.includes(term);
    });
  }, [feed.data, search]);

  // Track latest_transaction_at to auto-refresh feed
  const latestRef = useRef<string | null>(null);
  useEffect(() => {
    const serverLatest = stats.data?.latest_transaction_at;
    if (!serverLatest) return;

    if (latestRef.current && serverLatest > latestRef.current) {
      queryClient.invalidateQueries({
        queryKey: activityKeys.feed(businessId!, feedFilters),
      });
    }
    latestRef.current = serverLatest;
  }, [stats.data?.latest_transaction_at, businessId, feedFilters, queryClient]);

  const hasActiveFilters = typeFilter !== "all";

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
    <div className="flex flex-col gap-[14px] flex-1 min-h-0 animate-slide-up" style={{ animationDelay: "150ms" }}>
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-4">
            {t("title")}
            <ActivityLiveIndicator />
          </div>
        }
        subtitle={t("subtitle")}
      />

      {/* Stats */}
      <ActivityStatsBar stats={stats.data} isLoading={stats.isLoading} />

      {/* Search & Filter bar */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 shrink-0">
        <div className="flex gap-2.5 items-center flex-wrap">
          {/* Search input */}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t("searchPlaceholder")}
          />

          {/* Type filters */}
          {feed.isLoading ? (
            <ActivityFiltersSkeleton />
          ) : (
            <ActivityFilters selected={typeFilter} onSelect={setTypeFilter} />
          )}
        </div>
      </div>

      {/* Timeline Feed */}
      <div className="rounded-xl border border-[#EEEDEA] bg-white flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto px-3 py-2">
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
              hasActiveFilters={hasActiveFilters || !!search}
              stampIcon={stampIcon}
              rewardIcon={rewardIcon}
              stampFilledColor={colors?.accentHex}
              iconColor={colors?.iconColorHex}
            />
          )}
        </div>
      </div>

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
