"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBusiness } from "@/contexts/business-context";
import { getCustomerTransactions } from "@/api";
import { classifyCustomer, getSegmentConfig } from "@/lib/customer-segments";
import { CustomerQuickActions } from "./customer-quick-actions";
import { TransactionTimeline } from "./transaction-timeline";
import StampsDisplay from "@/components/stamps-display";
import type { CustomerResponse, TransactionResponse } from "@/types";
import { cn } from "@/lib/utils";

interface CustomerDetailSheetProps {
  customer: CustomerResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxStamps: number;
  onCustomerUpdated: () => void;
}

const LIMIT = 20;

export function CustomerDetailSheet({
  customer,
  open,
  onOpenChange,
  maxStamps,
  onCustomerUpdated,
}: CustomerDetailSheetProps) {
  const { currentBusiness } = useBusiness();
  const t = useTranslations("customers.detail");
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTransactions = useCallback(
    async (append = false) => {
      if (!currentBusiness?.id || !customer) return;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const offset = append ? transactions.length : 0;
        const data = await getCustomerTransactions(
          currentBusiness.id,
          customer.id,
          { limit: LIMIT, offset }
        );

        if (append) {
          setTransactions((prev) => [...prev, ...data.transactions]);
        } else {
          setTransactions(data.transactions);
        }
        setHasMore(data.has_more);
      } catch {
        // Silently fail — empty timeline shown
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [currentBusiness?.id, customer, transactions.length]
  );

  useEffect(() => {
    if (open && customer) {
      setTransactions([]);
      fetchTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer?.id]);

  const handleActionComplete = () => {
    fetchTransactions();
    onCustomerUpdated();
  };

  if (!customer) return null;

  const segment = classifyCustomer(customer, maxStamps);
  const segmentConfig = getSegmentConfig(segment);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  // Calculate quick stats
  const totalVisits = transactions.filter(
    (t) => t.stamp_delta > 0
  ).length;

  const firstVisit = customer.created_at;
  const lastVisit = customer.updated_at;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-0">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg">{customer.name}</SheetTitle>
            <Badge
              variant="outline"
              className={cn(
                "text-xs border",
                segmentConfig.color,
                segmentConfig.bgColor
              )}
            >
              {t(`segments.${segment}`)}
            </Badge>
          </div>
          <SheetDescription>{customer.email}</SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-5">
          {/* Stamp Progress */}
          <div>
            <p className="text-sm font-medium text-[var(--foreground)] mb-2">
              {t("stampProgress")}
            </p>
            <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--cream)]">
              <StampsDisplay count={customer.stamps} total={maxStamps} />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--cream)]">
              <p className="text-xs text-[var(--muted-foreground)]">
                {t("firstVisit")}
              </p>
              <p className="text-sm font-medium">{formatDate(firstVisit)}</p>
            </div>
            <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--cream)]">
              <p className="text-xs text-[var(--muted-foreground)]">
                {t("lastVisit")}
              </p>
              <p className="text-sm font-medium">{formatDate(lastVisit)}</p>
            </div>
            <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--cream)]">
              <p className="text-xs text-[var(--muted-foreground)]">
                {t("totalVisits")}
              </p>
              <p className="text-sm font-medium">{totalVisits}</p>
            </div>
            <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--cream)]">
              <p className="text-xs text-[var(--muted-foreground)]">
                {t("redemptions")}
              </p>
              <p className="text-sm font-medium">
                {customer.total_redemptions ?? 0}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          {currentBusiness && (
            <CustomerQuickActions
              customer={customer}
              businessId={currentBusiness.id}
              maxStamps={maxStamps}
              transactions={transactions}
              onActionComplete={handleActionComplete}
            />
          )}

          <Separator />

          {/* Recent Activity */}
          <div>
            <p className="text-sm font-medium text-[var(--foreground)] mb-3">
              {t("recentActivity")}
            </p>
            <TransactionTimeline
              transactions={transactions}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={() => fetchTransactions(true)}
              loadingMore={loadingMore}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
