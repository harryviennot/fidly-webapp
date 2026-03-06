"use client";

import { useTranslations } from "next-intl";
import {
  CaretUp,
  CaretDown,
  CaretLeft,
  CaretRight,
  Stamp,
  Gift,
  Prohibit,
} from "@phosphor-icons/react";
import type { CustomerResponse, CardDesign } from "@/types";
import {
  classifyCustomer,
  getSegmentConfig,
  SEGMENT_AVATAR_COLORS,
} from "@/lib/customer-segments";
import { StampProgress } from "./stamp-progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PAGE_SIZE } from "@/hooks/use-customers";

export type SortKey = "name" | "email" | "stamps" | "updated_at" | "total_redemptions";
export type SortDir = "asc" | "desc";

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

export interface CustomerDataTableProps {
  customers: CustomerResponse[];
  page: number;
  totalPages: number;
  totalCustomers: number;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onPageChange: (page: number) => void;
  onAddStamp: (e: React.MouseEvent, customer: CustomerResponse) => void;
  onRedeem: (e: React.MouseEvent, customer: CustomerResponse) => void;
  onVoid: (e: React.MouseEvent, customer: CustomerResponse) => void;
  design: CardDesign | undefined;
  totalStamps: number;
  searchTerm: string;
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string) => void;
  isPendingAddStamp: boolean;
  isPendingRedeem: boolean;
  isPendingVoid: boolean;
}

export function CustomerDataTable({
  customers,
  page,
  totalPages,
  totalCustomers,
  sortKey,
  sortDir,
  onSort,
  onPageChange,
  onAddStamp,
  onRedeem,
  onVoid,
  design,
  totalStamps,
  searchTerm,
  selectedCustomerId,
  onSelectCustomer,
  isPendingAddStamp,
  isPendingRedeem,
  isPendingVoid,
}: CustomerDataTableProps) {
  const t = useTranslations("customers");

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

  if (customers.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--muted-foreground)] text-sm">
        {searchTerm ? t("noResults") : t("empty")}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#F0EFEB] bg-white hover:bg-white">
              <TableHead
                className="cursor-pointer select-none text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4"
                onClick={() => onSort("name")}
              >
                {t("table.name")}
                <SortIndicator sortKey={sortKey} sortDir={sortDir} column="name" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4 hidden lg:table-cell"
                onClick={() => onSort("email")}
              >
                {t("table.email")}
                <SortIndicator sortKey={sortKey} sortDir={sortDir} column="email" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4"
                onClick={() => onSort("stamps")}
              >
                {t("table.stamps")}
                <SortIndicator sortKey={sortKey} sortDir={sortDir} column="stamps" />
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4">
                {t("table.segment")}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4 hidden lg:table-cell"
                onClick={() => onSort("total_redemptions")}
              >
                {t("table.redemptions")}
                <SortIndicator sortKey={sortKey} sortDir={sortDir} column="total_redemptions" />
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4 text-right">
                {t("table.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const segment = classifyCustomer(customer, totalStamps);
              const segConfig = getSegmentConfig(segment);
              const avatarColor = SEGMENT_AVATAR_COLORS[segment];
              const isSelected = selectedCustomerId === customer.id;

              return (
                <TableRow
                  key={customer.id}
                  className={cn(
                    "cursor-pointer border-b border-[#F8F7F5] transition-colors duration-100",
                    isSelected ? "bg-[#F0EDE7]" : "hover:bg-[#FAFAF8]"
                  )}
                  onClick={() => onSelectCustomer(customer.id)}
                >
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
                          {formatRelativeTime(customer.last_activity_at ?? customer.updated_at)}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-3 px-4 text-[12.5px] text-[#666] hidden lg:table-cell">
                    {customer.email}
                  </TableCell>

                  <TableCell className="py-3 px-4">
                    <StampProgress
                      count={customer.stamps}
                      total={totalStamps}
                      design={design}
                      size="sm"
                    />
                  </TableCell>

                  <TableCell className="py-3 px-4">
                    <span
                      className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
                      style={{ background: segConfig.bg, color: segConfig.color }}
                    >
                      {t(segConfig.labelKey)}
                    </span>
                  </TableCell>

                  <TableCell className="py-3 px-4 text-center text-[14px] font-semibold text-[#1A1A1A] hidden lg:table-cell">
                    {customer.total_redemptions ?? 0}
                  </TableCell>

                  <TableCell className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      {customer.stamps >= totalStamps ? (
                        <button
                          onClick={(e) => onRedeem(e, customer)}
                          disabled={isPendingRedeem}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "#FFF3E0", color: "#C4883D", border: "1px solid #F0DFC0" }}
                          title={t("actions.redeem")}
                        >
                          <Gift className="w-3 h-3" weight="bold" />
                          {t("actions.redeem")}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => onAddStamp(e, customer)}
                          disabled={isPendingAddStamp}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "#E8F5E4", color: "#4A7C59", border: "1px solid #C8E6C4" }}
                          title={t("actions.addStamp")}
                        >
                          <Stamp className="w-3 h-3" weight="bold" />
                          {t("actions.addStamp")}
                        </button>
                      )}
                      <button
                        onClick={(e) => onVoid(e, customer)}
                        disabled={isPendingVoid}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: "#fff", color: "#C75050", border: "1px solid #DEDBD5" }}
                        title={t("actions.voidLast")}
                      >
                        <Prohibit className="w-3 h-3" weight="bold" />
                        {t("actions.voidLast")}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[var(--border)] flex justify-between items-center text-[12px] text-[#8A8A8A]">
            <span>
              {t("pagination.showing", {
                from: page * PAGE_SIZE + 1,
                to: Math.min((page + 1) * PAGE_SIZE, totalCustomers),
                total: totalCustomers,
              })}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 0}
                className="w-7 h-7 rounded-md border border-[#DEDBD5] bg-white text-[#888] text-[11px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <CaretLeft className="w-3 h-3" weight="bold" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <button
                  key={i}
                  onClick={() => onPageChange(i)}
                  className="w-7 h-7 rounded-md text-[11px] font-semibold cursor-pointer flex items-center justify-center"
                  style={
                    page === i
                      ? { border: "1px solid #4A7C59", background: "#E8F5E4", color: "#3D6B3D" }
                      : { border: "1px solid #DEDBD5", background: "#fff", color: "#888" }
                  }
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => onPageChange(page + 1)}
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
          {customers.map((customer) => {
            const segment = classifyCustomer(customer, totalStamps);
            const segConfig = getSegmentConfig(segment);
            const avatarColor = SEGMENT_AVATAR_COLORS[segment];

            return (
              <div
                key={customer.id}
                onClick={() => onSelectCustomer(customer.id)}
                className={cn(
                  "p-3.5 cursor-pointer transition-colors",
                  selectedCustomerId === customer.id ? "bg-[#F0EDE7]" : "active:bg-[#FAFAF8]"
                )}
              >
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
                        style={{ background: segConfig.bg, color: segConfig.color }}
                      >
                        {t(segConfig.labelKey)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#A5A5A5] mt-0.5 truncate">
                      {customer.email}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <StampProgress
                    count={customer.stamps}
                    total={totalStamps}
                    design={design}
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

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[var(--border)] flex justify-between items-center text-[12px] text-[#8A8A8A]">
            <span>
              {t("pagination.showing", {
                from: page * PAGE_SIZE + 1,
                to: Math.min((page + 1) * PAGE_SIZE, totalCustomers),
                total: totalCustomers,
              })}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 0}
                className="w-7 h-7 rounded-md border border-[#DEDBD5] bg-white text-[#888] text-[11px] font-semibold cursor-pointer disabled:opacity-40 flex items-center justify-center"
              >
                <CaretLeft className="w-3 h-3" weight="bold" />
              </button>
              <span className="flex items-center px-2 text-[11px]">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
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
