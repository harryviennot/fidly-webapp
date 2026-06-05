"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { SearchBar } from "@/components/reusables/search-bar";
import { useBusiness } from "@/contexts/business-context";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useActiveDesign } from "@/hooks/use-designs";
import { useActivityStats, activityKeys } from "@/hooks/use-activity-stats";
import { useActivityFeed } from "@/hooks/use-activity-feed";
import { useLocations } from "@/hooks/use-locations";
import { useHasLegacyTransactions } from "@/hooks/use-transactions";
import { getCustomer } from "@/api";
import type { TransactionResponse, CustomerResponse } from "@/types";
import { ActivityStatsBar } from "@/components/activity/activity-stats-bar";
import { useActivityTypeFilterGroup } from "@/components/activity/activity-filters";
import type { FilterKey } from "@/components/activity/activity-filters";
import { ActivityFeed, ActivityFeedSkeleton } from "@/components/activity/activity-feed";
import { ActivityLiveIndicator } from "@/components/activity/activity-live-indicator";
import { useLocationFilterGroup } from "@/components/locations/location-filter";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import { PageHeader } from "@/components/redesign";
import { computeCardColors } from "@/lib/card-utils";
import type { StampIconType } from "@/components/design/StampIconPicker";

export default function ActivityPage() {
  const { currentBusiness } = useBusiness();
  const { hasFeature } = useEntitlements();
  const t = useTranslations("activity");
  const queryClient = useQueryClient();
  const businessId = currentBusiness?.id;

  const [typeFilter, setTypeFilter] = useState<FilterKey>("all");
  const [locationFilter, setLocationFilter] = useState<
    string | "__none__" | undefined
  >(undefined);
  const [search, setSearch] = useState("");
  // Keyed by id so stale data from a previous selection can't flash through
  // while the new customer is loading.
  const [fetchedCustomer, setFetchedCustomer] = useState<{ id: string; customer: CustomerResponse } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const selectedCustomerId = searchParams.get("customer");

  const setSelectedCustomerId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (id) params.set("customer", id);
      else params.delete("customer");
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [searchParams, router, pathname]
  );

  const { data: design } = useActiveDesign(businessId);
  const totalStamps = design?.total_stamps ?? 0;
  const colors = design ? computeCardColors(design) : null;
  const stampIcon = (design?.stamp_icon as StampIconType) ?? undefined;
  const rewardIcon = (design?.reward_icon as StampIconType) ?? undefined;

  const stats = useActivityStats(businessId);

  const canMultiLocation = hasFeature("locations.multiple");
  // Only fetch locations when Pro — non-Pro businesses have no use for the
  // filter and we don't want to clutter their network panel.
  const locationsQuery = useLocations(canMultiLocation ? businessId : undefined);
  const activeLocations = useMemo(
    () => (locationsQuery.data ?? []).filter((l) => !l.deleted_at),
    [locationsQuery.data]
  );
  // Whether the business has any NULL-location ("legacy") transactions. Drives
  // the visibility of the "Unassigned" filter option below.
  const legacyProbe = useHasLegacyTransactions(
    canMultiLocation && activeLocations.length >= 1 ? businessId : undefined
  );
  const hasLegacyTransactions = legacyProbe.data === true;
  // Show the filter once there's at least one location OR legacy rows. With a
  // single location and no legacy rows there's only one bucket — keep hidden.
  const showLocationUi =
    canMultiLocation &&
    (activeLocations.length > 1 ||
      (activeLocations.length === 1 && hasLegacyTransactions));

  const feedFilters = useMemo(
    () => ({
      type: typeFilter === "all" ? undefined : typeFilter,
      location_id: showLocationUi ? locationFilter : undefined,
    }),
    [typeFilter, locationFilter, showLocationUi]
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

  const hasActiveFilters =
    typeFilter !== "all" || (showLocationUi && locationFilter !== undefined);

  const handleItemClick = (txn: TransactionResponse) => {
    setSelectedCustomerId(txn.customer_id);
  };

  // Fetch the customer whenever the URL param changes (including on deep-link mount).
  useEffect(() => {
    if (!selectedCustomerId || !businessId) return;
    let cancelled = false;
    queryClient
      .fetchQuery({
        queryKey: ["customers", businessId, selectedCustomerId],
        queryFn: () => getCustomer(businessId, selectedCustomerId),
        staleTime: 60_000,
      })
      .then((customer) => {
        if (!cancelled) setFetchedCustomer({ id: selectedCustomerId, customer });
      })
      .catch(() => {
        if (!cancelled) setSelectedCustomerId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCustomerId, businessId, queryClient, setSelectedCustomerId]);

  const selectedCustomer =
    fetchedCustomer && fetchedCustomer.id === selectedCustomerId
      ? fetchedCustomer.customer
      : null;

  const typeFilterGroup = useActivityTypeFilterGroup(typeFilter, setTypeFilter);
  const locationFilterGroup = useLocationFilterGroup({
    locations: activeLocations,
    value: locationFilter,
    onChange: setLocationFilter,
    hasLegacyTransactions,
  });

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
      <SearchBar
        className="shrink-0"
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t("searchPlaceholder"),
        }}
        filters={[
          typeFilterGroup,
          { ...locationFilterGroup, hidden: !showLocationUi },
        ]}
      />

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
        open={!!selectedCustomerId}
        onOpenChange={(open) => {
          if (!open) setSelectedCustomerId(null);
        }}
        maxStamps={totalStamps}
        design={design ?? undefined}
      />
    </div>
  );
}
