"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  CaretUp,
  CaretDown,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Export,
  UserPlus,
  DotsThree,
} from "@phosphor-icons/react";
import { useBusiness } from "@/contexts/business-context";
import { useCustomers, useAddStamp, PAGE_SIZE } from "@/hooks/use-customers";
import { useTransactions } from "@/hooks/use-transactions";
import { useActiveDesign } from "@/hooks/use-designs";
import type { CustomerResponse } from "@/types";
import type { CustomerSegment } from "@/lib/customer-segments";
import {
  classifyCustomer,
  countBySegment,
  getSegmentConfig,
  SEGMENT_AVATAR_COLORS,
} from "@/lib/customer-segments";
import { calculateCustomerStats } from "@/lib/customer-stats";
import {
  CustomerStatsCards,
  CustomerStatsCardsSkeleton,
} from "@/components/customers/customer-stats-cards";
import {
  CustomerSegmentFilters,
  CustomerSegmentFiltersSkeleton,
} from "@/components/customers/customer-segment-filters";
import { EmptyCustomersState } from "@/components/customers/empty-customers-state";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import { PageHeader } from "@/components/redesign";
import { StampProgress } from "./customers/stamp-progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SortKey = "name" | "email" | "stamps" | "updated_at" | "total_redemptions";
type SortDir = "asc" | "desc";

function SortIndicator({
  column,
  sortKey,
  sortDir,
}: {
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  if (sortKey !== column) return null;
  return sortDir === "asc" ? (
    <CaretUp className="inline h-3 w-3 ml-0.5" weight="bold" />
  ) : (
    <CaretDown className="inline h-3 w-3 ml-0.5" weight="bold" />
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 1)
    .join("")
    .toUpperCase();
}

export default function CustomerTable() {
  const { currentBusiness } = useBusiness();
  const t = useTranslations("customers");
  const businessId = currentBusiness?.id;

  const [page, setPage] = useState(0);
  const { data: paginatedData, isLoading: customersLoading } = useCustomers(
    businessId,
    page
  );
  const { data: txnData } = useTransactions(businessId);
  const { data: design } = useActiveDesign(businessId);
  const addStampMutation = useAddStamp(businessId);

  const customers = useMemo(
    () => (Array.isArray(paginatedData?.data) ? paginatedData.data : []),
    [paginatedData]
  );
  const totalCustomers = paginatedData?.total ?? 0;
  const totalPages = Math.ceil(totalCustomers / PAGE_SIZE);

  const transactions = useMemo(
    () =>
      Array.isArray(txnData?.transactions) ? txnData.transactions : [],
    [txnData]
  );
  const totalStamps = design?.total_stamps ?? 10;
  const isLoading = customersLoading;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<
    CustomerSegment | "all"
  >("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId) ?? null
    : null;

  const handleAddStamp = async (
    e: React.MouseEvent,
    customer: CustomerResponse
  ) => {
    e.stopPropagation();
    if (!businessId) return;
    try {
      await addStampMutation.mutateAsync(customer.id);
      toast.success(t("toasts.stampAdded", { name: customer.name }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("toasts.stampFailed")
      );
    }
  };

  const stats = useMemo(
    () => calculateCustomerStats(customers, transactions),
    [customers, transactions]
  );

  const segmentCounts = useMemo(
    () => countBySegment(customers, totalStamps),
    [customers, totalStamps]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = customers;

    if (selectedSegment !== "all") {
      result = result.filter(
        (c) => classifyCustomer(c, totalStamps) === selectedSegment
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term)
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "email":
          cmp = a.email.localeCompare(b.email);
          break;
        case "stamps":
          cmp = a.stamps - b.stamps;
          break;
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

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t("time.today");
    if (diffDays === 1) return t("time.yesterday");
    if (diffDays < 7) return t("time.daysAgo", { count: diffDays });
    if (diffDays < 30)
      return t("time.weeksAgo", { count: Math.floor(diffDays / 7) });
    return t("time.monthsAgo", { count: Math.floor(diffDays / 30) });
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex flex-col gap-[14px]">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <CustomerStatsCardsSkeleton />
        <CustomerSegmentFiltersSkeleton />
        <CustomerTableSkeleton />
      </div>
    );
  }

  // ── Empty state ──
  if (customers.length === 0 && page === 0) {
    return (
      <div className="flex flex-col gap-[14px]">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <CustomerStatsCards stats={stats} />
        <EmptyCustomersState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: "150ms" }}>
      {/* Header */}
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-[#DEDBD5] bg-white text-[#555] text-[12px] font-medium gap-1.5"
            >
              <Export className="w-3.5 h-3.5" weight="bold" />
              {t("export")}
            </Button>
            <Button
              size="sm"
              className="rounded-lg bg-[#4A7C59] hover:bg-[#3D6B4D] text-white text-[12px] font-semibold gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" weight="bold" />
              {t("addCustomer")}
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <CustomerStatsCards stats={stats} />

      {/* Search & Filter bar */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5">
        <div className="flex gap-2.5 items-center flex-wrap">
          {/* Search input */}
          <div className="flex-1 min-w-[180px] flex items-center gap-2 px-3 py-2 rounded-lg border border-[#DEDBD5] bg-[#FAFAF8]">
            <MagnifyingGlass className="w-3.5 h-3.5 text-[#B0B0B0] shrink-0" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="border-none bg-transparent outline-none text-[12.5px] text-[#333] w-full font-[inherit] placeholder:text-[#B0B0B0]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-[#BBB] text-sm hover:text-[#888] p-0 bg-transparent border-none cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Segment filters */}
          <CustomerSegmentFilters
            segments={segmentCounts}
            totalCount={totalCustomers}
            selected={selectedSegment}
            onSelect={setSelectedSegment}
          />
        </div>
      </div>

      {/* Table / Empty results */}
      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)] text-sm">
          {searchTerm ? t("noResults") : t("empty")}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#F0EFEB] bg-white hover:bg-white">
                  <TableHead
                    className="cursor-pointer select-none text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4"
                    onClick={() => handleSort("name")}
                  >
                    {t("table.name")}
                    <SortIndicator sortKey={sortKey} sortDir={sortDir} column="name" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4 hidden lg:table-cell"
                    onClick={() => handleSort("email")}
                  >
                    {t("table.email")}
                    <SortIndicator sortKey={sortKey} sortDir={sortDir} column="email" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4"
                    onClick={() => handleSort("stamps")}
                  >
                    {t("table.stamps")}
                    <SortIndicator sortKey={sortKey} sortDir={sortDir} column="stamps" />
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4">
                    {t("table.segment")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4 hidden lg:table-cell"
                    onClick={() => handleSort("total_redemptions")}
                  >
                    {t("table.redemptions")}
                    <SortIndicator sortKey={sortKey} sortDir={sortDir} column="total_redemptions" />
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider w-[50px] px-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted.map((customer) => {
                  const segment = classifyCustomer(customer, totalStamps);
                  const segConfig = getSegmentConfig(segment);
                  const avatarColor = SEGMENT_AVATAR_COLORS[segment];
                  const isSelected = selectedCustomerId === customer.id;

                  return (
                    <TableRow
                      key={customer.id}
                      className={cn(
                        "cursor-pointer border-b border-[#F8F7F5] transition-colors duration-100",
                        isSelected
                          ? "bg-[#F0EDE7]"
                          : "hover:bg-[#FAFAF8]"
                      )}
                      onClick={() => setSelectedCustomerId(customer.id)}
                    >
                      {/* Customer — avatar + name + last visit */}
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                            style={{ background: avatarColor }}
                          >
                            {getInitials(customer.name)}
                          </div>
                          <div>
                            <div className="text-[13px] font-medium text-[#1A1A1A]">
                              {customer.name}
                            </div>
                            <div className="text-[10.5px] text-[#A5A5A5]">
                              {formatRelativeTime(
                                customer.last_activity_at ?? customer.updated_at
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="py-3 px-4 text-[12.5px] text-[#666] hidden lg:table-cell">
                        {customer.email}
                      </TableCell>

                      {/* Stamps */}
                      <TableCell className="py-3 px-4">
                        <StampProgress
                          count={customer.stamps}
                          total={totalStamps}
                          design={design ?? undefined}
                          size="sm"
                        />
                      </TableCell>

                      {/* Segment badge */}
                      <TableCell className="py-3 px-4">
                        <span
                          className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
                          style={{
                            background: segConfig.bg,
                            color: segConfig.color,
                          }}
                        >
                          {t(segConfig.labelKey)}
                        </span>
                      </TableCell>

                      {/* Redemptions */}
                      <TableCell className="py-3 px-4 text-center text-[14px] font-semibold text-[#1A1A1A] hidden lg:table-cell">
                        {customer.total_redemptions ?? 0}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddStamp(e, customer);
                          }}
                          className="text-[#BBB] hover:text-[#888] p-1 rounded-md bg-transparent border-none cursor-pointer flex"
                        >
                          <DotsThree className="w-5 h-5" weight="bold" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[#F0EFEB] flex justify-between items-center text-[12px] text-[#8A8A8A]">
                <span>
                  {t("pagination.showing", {
                    from: page * PAGE_SIZE + 1,
                    to: Math.min((page + 1) * PAGE_SIZE, totalCustomers),
                    total: totalCustomers,
                  })}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 0}
                    className="w-7 h-7 rounded-md border border-[#DEDBD5] bg-white text-[#888] text-[11px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <CaretLeft className="w-3 h-3" weight="bold" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className="w-7 h-7 rounded-md text-[11px] font-semibold cursor-pointer flex items-center justify-center"
                      style={
                        page === i
                          ? {
                              border: "1px solid #4A7C59",
                              background: "#E8F5E4",
                              color: "#3D6B3D",
                            }
                          : {
                              border: "1px solid #DEDBD5",
                              background: "#fff",
                              color: "#888",
                            }
                      }
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                    className="w-7 h-7 rounded-md border border-[#DEDBD5] bg-white text-[#888] text-[11px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <CaretRight className="w-3 h-3" weight="bold" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile list view */}
          <div className="md:hidden rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="divide-y divide-[#F8F7F5]">
              {filteredAndSorted.map((customer) => {
                const segment = classifyCustomer(customer, totalStamps);
                const segConfig = getSegmentConfig(segment);
                const avatarColor = SEGMENT_AVATAR_COLORS[segment];

                return (
                  <div
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={cn(
                      "p-3.5 cursor-pointer transition-colors",
                      selectedCustomerId === customer.id
                        ? "bg-[#F0EDE7]"
                        : "active:bg-[#FAFAF8]"
                    )}
                  >
                    {/* Row 1: Avatar + name + segment + email */}
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
                        style={{ background: avatarColor }}
                      >
                        {getInitials(customer.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-[#1A1A1A] truncate">
                            {customer.name}
                          </span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                            style={{
                              background: segConfig.bg,
                              color: segConfig.color,
                            }}
                          >
                            {t(segConfig.labelKey)}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#A5A5A5] mt-0.5 truncate">
                          {customer.email}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Stamps + redemptions */}
                    <div className="flex justify-between items-center">
                      <StampProgress
                        count={customer.stamps}
                        total={totalStamps}
                        design={design ?? undefined}
                        size="sm"
                      />
                      <div className="text-[11px] text-[#8A8A8A]">
                        {customer.total_redemptions ?? 0} {t("table.redemptions").toLowerCase()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[#F0EFEB] flex justify-between items-center text-[12px] text-[#8A8A8A]">
                <span>
                  {t("pagination.showing", {
                    from: page * PAGE_SIZE + 1,
                    to: Math.min((page + 1) * PAGE_SIZE, totalCustomers),
                    total: totalCustomers,
                  })}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 0}
                    className="w-7 h-7 rounded-md border border-[#DEDBD5] bg-white text-[#888] text-[11px] font-semibold cursor-pointer disabled:opacity-40 flex items-center justify-center"
                  >
                    <CaretLeft className="w-3 h-3" weight="bold" />
                  </button>
                  <span className="flex items-center px-2 text-[11px]">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                    className="w-7 h-7 rounded-md border border-[#DEDBD5] bg-white text-[#888] text-[11px] font-semibold cursor-pointer disabled:opacity-40 flex items-center justify-center"
                  >
                    <CaretRight className="w-3 h-3" weight="bold" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail sheet */}
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

export function CustomerTableSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-[var(--muted)] animate-pulse" />
            <div className="h-4 w-28 bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-4 w-40 bg-[var(--muted)] rounded animate-pulse hidden md:block" />
            <div className="h-4 w-20 bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-5 w-16 bg-[var(--muted)] rounded-full animate-pulse" />
            <div className="h-4 w-8 bg-[var(--muted)] rounded animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
