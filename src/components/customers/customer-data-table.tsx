"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  CaretUp,
  CaretDown,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { InfoPopover } from "@/components/reusables/info-popover";
import type { CustomerResponse, CardDesign, LoyaltyType } from "@/types";
import {
  classifyCustomer,
  getSegmentConfig,
  SEGMENT_AVATAR_COLORS,
} from "@/lib/customer-segments";
import { StampProgress } from "./stamp-progress";
import { CustomerActionButton } from "./customer-action-button";
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

export type SortKey = "name" | "stamps" | "updated_at" | "total_redemptions";
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
  /** The program's loyalty type. Points list rows render neutrally because the
   *  list endpoint has no per-customer points snapshot yet (backend Phase 8). */
  loyaltyType?: LoyaltyType;
  searchTerm: string;
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string) => void;
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
  loyaltyType = 'stamp',
  searchTerm,
  selectedCustomerId,
  onSelectCustomer,
  isPendingRedeem,
  isPendingVoid,
}: CustomerDataTableProps) {
  const isPoints = loyaltyType === 'points';
  const t = useTranslations("customers");
  const locale = useLocale();
  // French puts a space before the colon; English does not.
  const sep = locale === "fr" ? " : " : ": ";

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
      <div className="hidden md:block rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden @container">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#F0EFEB] bg-white hover:bg-white">
              <TableHead
                className="cursor-pointer select-none text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-3"
                onClick={() => onSort("name")}
              >
                {t("table.name")}
                <SortIndicator sortKey={sortKey} sortDir={sortDir} column="name" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-3 whitespace-nowrap"
                onClick={() => onSort("stamps")}
              >
                {t("table.stamps")}
                <SortIndicator sortKey={sortKey} sortDir={sortDir} column="stamps" />
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-3 hidden @[32rem]:table-cell">
                <span className="inline-flex items-center gap-1">
                  {t("table.segment")}
                  <InfoPopover
                    label={t("segmentsHelp.title")}
                    side="top"
                    align="start"
                    content={
                      <div className="space-y-1.5 normal-case tracking-normal font-normal">
                        <div><span className="font-semibold">{t("segments.new")}</span>{sep}{t("segmentsHelp.new")}</div>
                        <div><span className="font-semibold">{t("segments.regular")}</span>{sep}{t("segmentsHelp.regular")}</div>
                        <div><span className="font-semibold">{t("segments.vip")}</span>{sep}{t("segmentsHelp.vip")}</div>
                        <div><span className="font-semibold">{t("segments.rewardReady")}</span>{sep}{t("segmentsHelp.rewardReady")}</div>
                        <div><span className="font-semibold">{t("segments.closeToReward")}</span>{sep}{t("segmentsHelp.closeToReward")}</div>
                        <div><span className="font-semibold">{t("segments.atRisk")}</span>{sep}{t("segmentsHelp.atRisk")}</div>
                        <div><span className="font-semibold">{t("segments.ghost")}</span>{sep}{t("segmentsHelp.ghost")}</div>
                      </div>
                    }
                  />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-3 hidden @[44rem]:table-cell text-center whitespace-nowrap"
                onClick={() => onSort("total_redemptions")}
              >
                {t("table.redemptions")}
                <SortIndicator sortKey={sortKey} sortDir={sortDir} column="total_redemptions" />
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-3 text-right whitespace-nowrap">
                {t("table.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const segment =
                (customer.segment as ReturnType<typeof classifyCustomer> | undefined) ??
                classifyCustomer(customer, totalStamps, undefined, loyaltyType);
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
                  <TableCell className="py-3 px-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                        style={{ background: avatarColor }}
                      >
                        {getInitials(customer.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[#1A1A1A] line-clamp-2 leading-snug">
                          {customer.name}
                        </div>
                        <div className="text-[10.5px] text-[#A5A5A5] line-clamp-1">
                          {formatRelativeTime(customer.last_activity_at ?? customer.updated_at)}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-3 px-3">
                    {isPoints ? (
                      <span className="text-[12px] text-[#A5A5A5]">{t("pointsCustomer")}</span>
                    ) : (
                      <StampProgress
                        count={customer.stamps}
                        total={totalStamps}
                        design={design}
                        size="sm"
                      />
                    )}
                  </TableCell>

                  <TableCell className="py-3 px-3 hidden @[32rem]:table-cell">
                    <span
                      className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
                      style={{ background: segConfig.bg, color: segConfig.color }}
                    >
                      {t(segConfig.labelKey)}
                    </span>
                  </TableCell>

                  <TableCell className="py-3 px-3 text-center text-[14px] font-semibold text-[#1A1A1A] hidden @[44rem]:table-cell">
                    {customer.total_redemptions ?? 0}
                  </TableCell>

                  <TableCell className="py-3 px-3">
                    {/* Points list actions need the customer's balance + reward
                        menu (backend Phase 8). Until then the row opens the
                        detail sheet, which has the full points snapshot. */}
                    {isPoints ? (
                      <div className="flex items-center justify-end">
                        <CustomerActionButton
                          variant="stamp"
                          size="sm"
                          label={t("actions.open")}
                          onClick={() => onSelectCustomer(customer.id)}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        {customer.stamps >= totalStamps ? (
                          <CustomerActionButton
                            variant="redeem"
                            size="sm"
                            label={t("actions.redeem")}
                            onClick={(e) => onRedeem(e, customer)}
                            loading={isPendingRedeem}
                          />
                        ) : (
                          <CustomerActionButton
                            variant="stamp"
                            size="sm"
                            label={t("actions.addStamp")}
                            onClick={(e) => onAddStamp(e, customer)}
                          />
                        )}
                        <CustomerActionButton
                          variant="void"
                          size="sm"
                          label={t("actions.voidLast")}
                          onClick={(e) => onVoid(e, customer)}
                          loading={isPendingVoid}
                        />
                      </div>
                    )}
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
            const segment =
              (customer.segment as ReturnType<typeof classifyCustomer> | undefined) ??
              classifyCustomer(customer, totalStamps, undefined, loyaltyType);
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
                  </div>
                </div>

                <div className="flex justify-between items-center gap-3">
                  <div className="flex-1 min-w-0">
                    {isPoints ? (
                      <span className="text-[12px] text-[#A5A5A5]">{t("pointsCustomer")}</span>
                    ) : (
                      <StampProgress
                        count={customer.stamps}
                        total={totalStamps}
                        design={design}
                        size="sm"
                      />
                    )}
                  </div>
                  <div className="text-[11px] text-[#8A8A8A] shrink-0 whitespace-nowrap">
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
