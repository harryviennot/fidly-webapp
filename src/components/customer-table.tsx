"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { CaretUpIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useBusiness } from "@/contexts/business-context";
import { useCustomers, useAddStamp, PAGE_SIZE } from "@/hooks/use-customers";
import { useTransactions } from "@/hooks/use-transactions";
import { useActiveDesign } from "@/hooks/use-designs";
import type { CustomerResponse } from "@/types";
import type { CustomerSegment } from "@/lib/customer-segments";
import { classifyCustomer, countBySegment } from "@/lib/customer-segments";
import { calculateCustomerStats } from "@/lib/customer-stats";
import { CustomerStatsCards, CustomerStatsCardsSkeleton } from "@/components/customers/customer-stats-cards";
import { CustomerSegmentFilters, CustomerSegmentFiltersSkeleton } from "@/components/customers/customer-segment-filters";
import { EmptyCustomersState } from "@/components/customers/empty-customers-state";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StampProgress } from "./customers/stamp-progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getSegmentConfig } from "@/lib/customer-segments";

type SortKey = "name" | "email" | "stamps" | "updated_at" | "total_redemptions";
type SortDir = "asc" | "desc";

function SortIndicator({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== column) return null;
  return sortDir === "asc" ? (
    <CaretUpIcon className="inline h-3.5 w-3.5 ml-1" />
  ) : (
    <CaretDownIcon className="inline h-3.5 w-3.5 ml-1" />
  );
}

export default function CustomerTable() {
  const { currentBusiness } = useBusiness();
  const t = useTranslations("customers");
  const businessId = currentBusiness?.id;

  const [page, setPage] = useState(0);
  const { data: paginatedData, isLoading: customersLoading } = useCustomers(businessId, page);
  const { data: txnData } = useTransactions(businessId);
  const { data: design } = useActiveDesign(businessId);
  const addStampMutation = useAddStamp(businessId);

  const customers = useMemo(() => paginatedData?.data ?? [], [paginatedData]);
  const totalCustomers = paginatedData?.total ?? 0;
  const totalPages = Math.ceil(totalCustomers / PAGE_SIZE);

  const transactions = useMemo(() => txnData?.transactions ?? [], [txnData]);
  const totalStamps = design?.total_stamps ?? 10;
  const isLoading = customersLoading;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId) ?? null
    : null;

  const handleAddStamp = async (e: React.MouseEvent, customer: CustomerResponse) => {
    e.stopPropagation();
    if (!businessId) return;
    try {
      await addStampMutation.mutateAsync(customer.id);
      toast.success(t("toasts.stampAdded", { name: customer.name }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.stampFailed"));
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

    // Filter by segment
    if (selectedSegment !== "all") {
      result = result.filter(
        (c) => classifyCustomer(c, totalStamps) === selectedSegment
      );
    }

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term)
      );
    }

    // Sort
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
          cmp = (a.last_activity_at ?? a.updated_at ?? "").localeCompare(b.last_activity_at ?? b.updated_at ?? "");
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
    if (diffDays < 30) return t("time.weeksAgo", { count: Math.floor(diffDays / 7) });
    return t("time.monthsAgo", { count: Math.floor(diffDays / 30) });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <CustomerStatsCardsSkeleton />
        <CustomerSegmentFiltersSkeleton />
        <CustomerTableSkeleton />
      </div>
    );
  }

  if (customers.length === 0 && page === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <CustomerStatsCards stats={stats} />
        <EmptyCustomersState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("title")}</h2>
      <CustomerStatsCards stats={stats} />

      <CustomerSegmentFilters
        segments={segmentCounts}
        totalCount={totalCustomers}
        selected={selectedSegment}
        onSelect={setSelectedSegment}
      />

      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          {searchTerm ? t("noResults") : t("empty")}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--cream)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  {t("table.name")}
                  <SortIndicator sortKey={sortKey} sortDir={sortDir} column="name" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hidden md:table-cell"
                  onClick={() => handleSort("email")}
                >
                  {t("table.email")}
                  <SortIndicator sortKey={sortKey} sortDir={sortDir} column="email" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("stamps")}
                >
                  {t("table.stamps")}
                  <SortIndicator sortKey={sortKey} sortDir={sortDir} column="stamps" />
                </TableHead>
                <TableHead>{t("table.segment")}</TableHead>
                <TableHead
                  className="cursor-pointer select-none hidden md:table-cell"
                  onClick={() => handleSort("updated_at")}
                >
                  {t("table.lastVisit")}
                  <SortIndicator sortKey={sortKey} sortDir={sortDir} column="updated_at" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hidden lg:table-cell"
                  onClick={() => handleSort("total_redemptions")}
                >
                  {t("table.redemptions")}
                  <SortIndicator sortKey={sortKey} sortDir={sortDir} column="total_redemptions" />
                </TableHead>
                <TableHead>{t("table.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.map((customer) => {
                const segment = classifyCustomer(customer, totalStamps);
                const segmentConfig = getSegmentConfig(segment);
                const isMaxed = customer.stamps >= totalStamps;
                const isStamping = addStampMutation.isPending && addStampMutation.variables === customer.id;

                return (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-[var(--muted)]/50"
                    onClick={() => setSelectedCustomerId(customer.id)}
                  >
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-[var(--muted-foreground)]">
                      {customer.email}
                    </TableCell>
                    <TableCell>
                      <StampProgress count={customer.stamps} total={totalStamps} design={design ?? undefined} size="sm" />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs border",
                          segmentConfig.color,
                          segmentConfig.bgColor
                        )}
                      >
                        {t(segmentConfig.labelKey)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-[var(--muted-foreground)]">
                      {formatRelativeTime(customer.last_activity_at ?? customer.updated_at)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center">
                      {customer.total_redemptions ?? 0}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="gradient"
                        className="rounded-full"
                        onClick={(e) => handleAddStamp(e, customer)}
                        disabled={isStamping || isMaxed}
                      >
                        {isMaxed ? t("actions.maxed") : t("actions.addStamp")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("pagination.showing", {
              from: page * PAGE_SIZE + 1,
              to: Math.min((page + 1) * PAGE_SIZE, totalCustomers),
              total: totalCustomers,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              <CaretLeftIcon className="h-4 w-4" />
              {t("pagination.previous")}
            </Button>
            <span className="text-sm text-[var(--muted-foreground)] px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              {t("pagination.next")}
              <CaretRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--cream)]">
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 w-28 bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-4 w-40 bg-[var(--muted)] rounded animate-pulse hidden md:block" />
            <div className="h-4 w-20 bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-5 w-16 bg-[var(--muted)] rounded-full animate-pulse" />
            <div className="h-4 w-16 bg-[var(--muted)] rounded animate-pulse hidden md:block" />
            <div className="h-8 w-20 bg-[var(--muted)] rounded animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
