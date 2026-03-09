"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useBusiness } from "@/contexts/business-context";
import { useCustomers, useAddStamp, useRedeemReward, useVoidStamp, PAGE_SIZE } from "@/hooks/use-customers";
import { useTransactions } from "@/hooks/use-transactions";
import { useActiveDesign } from "@/hooks/use-designs";
import type { CustomerResponse } from "@/types";
import type { CustomerSegment } from "@/lib/customer-segments";
import { classifyCustomer, countBySegment } from "@/lib/customer-segments";
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
import {
  CustomerDataTable,
  CustomerTableSkeleton,
  type SortKey,
  type SortDir,
} from "@/components/customers/customer-data-table";
import { PageHeader } from "@/components/redesign";
import { SearchInput } from "@/components/reusables/search-input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CustomersPage() {
  const { currentBusiness } = useBusiness();
  const t = useTranslations("customers");
  const businessId = currentBusiness?.id;

  const [page, setPage] = useState(0);
  const { data: paginatedData, isLoading: customersLoading } = useCustomers(businessId, page);
  const { data: txnData } = useTransactions(businessId);
  const { data: design } = useActiveDesign(businessId);
  const addStampMutation = useAddStamp(businessId);
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
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidTarget, setVoidTarget] = useState<{ customerId: string; transactionId: string } | null>(null);

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

  const handleRedeem = async (e: React.MouseEvent, customer: CustomerResponse) => {
    e.stopPropagation();
    if (!businessId) return;
    try {
      await redeemMutation.mutateAsync(customer.id);
      toast.success(t("actions.redeemSuccessToast"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("actions.redeemFailedToast"));
    }
  };

  const handleVoid = (e: React.MouseEvent, customer: CustomerResponse) => {
    e.stopPropagation();
    if (!businessId) return;
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
    setVoidTarget({ customerId: customer.id, transactionId: lastVoidable.id });
    setVoidDialogOpen(true);
  };

  const handleVoidConfirm = useCallback(async () => {
    if (!voidTarget || !voidReason.trim()) return;
    try {
      await voidMutation.mutateAsync({
        customerId: voidTarget.customerId,
        transactionId: voidTarget.transactionId,
        reason: voidReason.trim(),
      });
      toast.success(t("actions.voidSuccessToast"));
      setVoidDialogOpen(false);
      setVoidReason("");
      setVoidTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("actions.voidFailedToast"));
    }
  }, [voidTarget, voidReason, voidMutation, t]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
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

  const filteredAndSorted = useMemo(() => {
    let result = customers;

    if (selectedSegment !== "all") {
      result = result.filter((c) => classifyCustomer(c, totalStamps) === selectedSegment);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term)
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "email": cmp = a.email.localeCompare(b.email); break;
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
        <CustomerStatsCards stats={stats} />
        <EmptyCustomersState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: "150ms" }}>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <CustomerStatsCards stats={stats} />

      {/* Search & Filter bar */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5">
        <div className="flex gap-2.5 items-center flex-wrap">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("searchPlaceholder")}
          />
          <CustomerSegmentFilters
            segments={segmentCounts}
            totalCount={totalCustomers}
            selected={selectedSegment}
            onSelect={setSelectedSegment}
          />
        </div>
      </div>

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
        isPendingAddStamp={addStampMutation.isPending}
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

      <Dialog
        open={voidDialogOpen}
        onOpenChange={(open) => {
          setVoidDialogOpen(open);
          if (!open) {
            setVoidReason("");
            setVoidTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("actions.voidDialogTitle")}</DialogTitle>
            <DialogDescription>{t("actions.voidDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              {t("actions.voidReasonLabel")}
            </label>
            <Textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder={t("actions.voidReasonPlaceholder")}
              maxLength={500}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setVoidDialogOpen(false);
                setVoidReason("");
                setVoidTarget(null);
              }}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              variant="outline"
              className="rounded-lg text-[#C75050] border-[#FDE8E4] hover:bg-[#FDE8E4]"
              onClick={handleVoidConfirm}
              disabled={voidMutation.isPending || !voidReason.trim()}
            >
              {voidMutation.isPending ? t("actions.voiding") : t("actions.confirmVoid")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
