"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "@/contexts/business-context";
import { useCustomers, useRedeemReward, useVoidStamp, customerKeys, PAGE_SIZE } from "@/hooks/use-customers";
import { useTransactions } from "@/hooks/use-transactions";
import { useBusinessAchievements } from "@/hooks/use-business-achievements";
import { useActiveDesign } from "@/hooks/use-designs";
import { getCustomer } from "@/api";
import type { CustomerResponse } from "@/types";
import type { CustomerSegment } from "@/lib/customer-segments";
import { classifyCustomer, countBySegment } from "@/lib/customer-segments";
import {
  CustomerStatsCards,
  CustomerStatsCardsSkeleton,
} from "@/components/customers/customer-stats-cards";
import {
  useCustomerSegmentFilterGroup,
  CustomerSegmentFiltersSkeleton,
} from "@/components/customers/customer-segment-filters";
import { EmptyCustomersState } from "@/components/customers/empty-customers-state";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import { StampAdjustmentDialog } from "@/components/customers/stamp-adjustment-dialog";
import { StampVoidDialog } from "@/components/customers/stamp-void-dialog";
import {
  CustomerDataTable,
  CustomerTableSkeleton,
  type SortKey,
  type SortDir,
} from "@/components/customers/customer-data-table";
import { PageHeader } from "@/components/redesign";
import { SearchBar } from "@/components/reusables/search-bar";
import { toast } from "sonner";

export default function CustomersPage() {
  const { currentBusiness } = useBusiness();
  const t = useTranslations("customers");
  const businessId = currentBusiness?.id;

  const [page, setPage] = useState(0);
  const { data: paginatedData, isLoading: customersLoading } = useCustomers(businessId, page);
  const { data: txnData } = useTransactions(businessId);
  const { data: achievements } = useBusinessAchievements(businessId);
  const { data: design } = useActiveDesign(businessId);
  const redeemMutation = useRedeemReward(businessId);
  const voidMutation = useVoidStamp(businessId);

  const customers = useMemo(
    () => (Array.isArray(paginatedData?.data) ? paginatedData.data : []),
    [paginatedData]
  );
  const totalCustomers = paginatedData?.total ?? 0;
  const totalPages = Math.ceil(totalCustomers / PAGE_SIZE);

  const transactions = useMemo(
    () => (Array.isArray(txnData?.transactions) ? txnData.transactions : []),
    [txnData]
  );
  const totalStamps = design?.total_stamps ?? 10;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [voidTarget, setVoidTarget] = useState<{
    customerId: string;
    customerName: string;
    enrollmentId: string;
    transactionId: string;
  } | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<{
    customerId: string;
    customerName: string;
    enrollmentId: string;
  } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const queryClient = useQueryClient();

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

  // Pagination fallback: the customer referenced in the URL may not be on the
  // currently loaded page. Fetch it directly so deep links work for any customer.
  // Keyed by id so stale data from a previous selection can't flash through.
  const [fallback, setFallback] = useState<{ id: string; customer: CustomerResponse } | null>(null);

  useEffect(() => {
    if (!selectedCustomerId || !businessId) return;
    if (customers.some((c) => c.id === selectedCustomerId)) return;
    let cancelled = false;
    queryClient
      .fetchQuery({
        queryKey: customerKeys.detail(businessId, selectedCustomerId),
        queryFn: () => getCustomer(businessId, selectedCustomerId),
        staleTime: 60_000,
      })
      .then((customer) => {
        if (!cancelled) setFallback({ id: selectedCustomerId, customer });
      })
      .catch(() => {
        if (!cancelled) setSelectedCustomerId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCustomerId, businessId, customers, queryClient, setSelectedCustomerId]);

  const fallbackCustomer =
    fallback && fallback.id === selectedCustomerId ? fallback.customer : null;
  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId) ?? fallbackCustomer
    : null;

  const handleAddStamp = (e: React.MouseEvent, customer: CustomerResponse) => {
    e.stopPropagation();
    if (!businessId) return;
    const enrollmentId = customer.enrollments[0]?.id;
    if (!enrollmentId) return;
    setAdjustTarget({
      customerId: customer.id,
      customerName: customer.name,
      enrollmentId,
    });
  };

  const handleRedeem = async (e: React.MouseEvent, customer: CustomerResponse) => {
    e.stopPropagation();
    if (!businessId) return;
    const enrollmentId = customer.enrollments[0]?.id;
    if (!enrollmentId) return;
    try {
      await redeemMutation.mutateAsync({ customerId: customer.id, enrollmentId });
      toast.success(t("actions.redeemSuccessToast"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("actions.redeemFailedToast"));
    }
  };

  const handleVoid = (e: React.MouseEvent, customer: CustomerResponse) => {
    e.stopPropagation();
    if (!businessId) return;
    const enrollmentId = customer.enrollments[0]?.id;
    if (!enrollmentId) return;
    const customerTxns = transactions.filter((txn) => txn.customer_id === customer.id);
    const lastVoidable = customerTxns.find(
      (txn) =>
        (txn.type === "stamp_added" || txn.type === "bonus_stamp") &&
        !customerTxns.some(
          (v) => v.type === "stamp_voided" && v.voided_transaction_id === txn.id
        )
    );
    if (!lastVoidable) {
      toast.error(t("actions.noVoidableStamp"));
      return;
    }
    setVoidTarget({
      customerId: customer.id,
      customerName: customer.name,
      enrollmentId,
      transactionId: lastVoidable.id,
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const segmentCounts = useMemo(
    () => countBySegment(customers, totalStamps),
    [customers, totalStamps]
  );

  const filteredAndSorted = useMemo(() => {
    let result = customers;

    if (selectedSegment !== "all") {
      result = result.filter((c) => classifyCustomer(c, totalStamps) === selectedSegment);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(term) || (c.email ?? "").toLowerCase().includes(term)
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "stamps": cmp = a.stamps - b.stamps; break;
        case "updated_at":
          cmp = (a.last_activity_at ?? a.updated_at ?? "").localeCompare(
            b.last_activity_at ?? b.updated_at ?? ""
          );
          break;
        case "total_redemptions":
          cmp = (a.total_redemptions ?? 0) - (b.total_redemptions ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [customers, selectedSegment, searchTerm, sortKey, sortDir, totalStamps]);

  const segmentFilterGroup = useCustomerSegmentFilterGroup({
    segments: segmentCounts,
    totalCount: totalCustomers,
    selected: selectedSegment,
    onSelect: setSelectedSegment,
  });

  // Sort control shared by the toolbar (works on mobile + desktop) and the
  // desktop table headers — both read/write the same sortKey/sortDir state, so
  // they stay in sync. Option values ARE the SortKey union (no mapping needed).
  const sortConfig = {
    options: [
      { value: "name", label: t("sort.name") },
      { value: "stamps", label: t("sort.stamps") },
      { value: "total_redemptions", label: t("sort.rewards") },
      { value: "updated_at", label: t("sort.lastActivity") },
    ],
    value: sortKey,
    direction: sortDir,
    onChange: (value: string, direction: SortDir) => {
      setSortKey(value as SortKey);
      setSortDir(direction);
    },
  };

  if (customersLoading) {
    return (
      <div className="flex flex-col gap-[14px]">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <CustomerStatsCardsSkeleton />
        <CustomerSegmentFiltersSkeleton />
        <CustomerTableSkeleton />
      </div>
    );
  }

  if (customers.length === 0 && page === 0) {
    return (
      <div className="flex flex-col gap-[14px]">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <CustomerStatsCards totalCustomers={totalCustomers} achievements={achievements} />
        <EmptyCustomersState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: "150ms" }}>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <CustomerStatsCards totalCustomers={totalCustomers} achievements={achievements} />

      {/* Search & Filter bar */}
      <SearchBar
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: t("searchPlaceholder"),
        }}
        filters={[segmentFilterGroup]}
        sort={sortConfig}
      />

      <CustomerDataTable
        customers={filteredAndSorted}
        page={page}
        totalPages={totalPages}
        totalCustomers={totalCustomers}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onPageChange={setPage}
        onAddStamp={handleAddStamp}
        onRedeem={handleRedeem}
        onVoid={handleVoid}
        design={design ?? undefined}
        totalStamps={totalStamps}
        searchTerm={searchTerm}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={setSelectedCustomerId}
        isPendingRedeem={redeemMutation.isPending}
        isPendingVoid={voidMutation.isPending}
      />

      <CustomerDetailSheet
        customer={selectedCustomer}
        open={!!selectedCustomerId}
        onOpenChange={(open) => { if (!open) setSelectedCustomerId(null); }}
        maxStamps={totalStamps}
        design={design ?? undefined}
      />

      {businessId && adjustTarget && (
        <StampAdjustmentDialog
          open={!!adjustTarget}
          onOpenChange={(open) => { if (!open) setAdjustTarget(null); }}
          businessId={businessId}
          customerId={adjustTarget.customerId}
          customerName={adjustTarget.customerName}
          enrollmentId={adjustTarget.enrollmentId}
        />
      )}

      {businessId && voidTarget && (
        <StampVoidDialog
          open={!!voidTarget}
          onOpenChange={(open) => { if (!open) setVoidTarget(null); }}
          businessId={businessId}
          customerId={voidTarget.customerId}
          customerName={voidTarget.customerName}
          enrollmentId={voidTarget.enrollmentId}
          transactionId={voidTarget.transactionId}
        />
      )}
    </div>
  );
}
