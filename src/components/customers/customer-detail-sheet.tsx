"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarBlankIcon,
  ClockIcon,
  FootprintsIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
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
import { StampProgress } from "./stamp-progress";
import { computeCardColors } from "@/lib/card-utils";
import {
  useCustomerTransactions,
  transactionKeys,
} from "@/hooks/use-transactions";
import type { CustomerResponse, TransactionResponse } from "@/types";
import type { CardDesign } from "@/types/design";
import type { StampIconType } from "@/components/design/StampIconPicker";
import { cn } from "@/lib/utils";

interface CustomerDetailSheetProps {
  customer: CustomerResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxStamps: number;
  design?: CardDesign;
}

const LIMIT = 20;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const SEGMENT_AVATAR_COLORS: Record<string, string> = {
  new: "from-blue-500 to-blue-600",
  regular: "from-slate-500 to-slate-600",
  vip: "from-amber-500 to-orange-500",
  close_to_reward: "from-emerald-500 to-green-600",
  at_risk: "from-red-400 to-red-500",
};

export function CustomerDetailSheet({
  customer,
  open,
  onOpenChange,
  maxStamps,
  design,
}: CustomerDetailSheetProps) {
  const { currentBusiness } = useBusiness();
  const t = useTranslations("customers.detail");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const query = useCustomerTransactions(
    currentBusiness?.id,
    customer?.id,
    open && !!customer
  );

  const [extraTransactions, setExtraTransactions] = useState<
    TransactionResponse[]
  >([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const queryDataRef = query.data;
  useMemo(() => {
    setExtraTransactions([]);
    setHasMore(queryDataRef?.has_more ?? false);
  }, [queryDataRef]);

  const transactions = useMemo(
    () => [...(query.data?.transactions ?? []), ...extraTransactions],
    [query.data?.transactions, extraTransactions]
  );

  const loadMore = async () => {
    if (!currentBusiness?.id || !customer) return;
    setLoadingMore(true);
    try {
      const data = await getCustomerTransactions(
        currentBusiness.id,
        customer.id,
        { limit: LIMIT, offset: transactions.length }
      );
      setExtraTransactions((prev) => [...prev, ...data.transactions]);
      setHasMore(data.has_more);
    } catch {
      // Silently fail
    } finally {
      setLoadingMore(false);
    }
  };

  const handleActionComplete = () => {
    if (currentBusiness?.id && customer?.id) {
      queryClient.invalidateQueries({
        queryKey: transactionKeys.customer(currentBusiness.id, customer.id),
      });
    }
  };

  if (!customer) return null;

  const segment = classifyCustomer(customer, maxStamps);
  const segmentConfig = getSegmentConfig(segment);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const totalVisits = transactions.filter(
    (t) => t.stamp_delta > 0
  ).length;

  const firstVisit = customer.created_at;
  const lastVisit = customer.updated_at;
  const stampProgress = maxStamps > 0 ? (customer.stamps / maxStamps) * 100 : 0;
  const colors = design ? computeCardColors(design) : null;
  const stampIcon = (design?.stamp_icon as StampIconType) ?? undefined;
  const rewardIcon = (design?.reward_icon as StampIconType) ?? undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-lg overflow-y-auto p-0 gap-0"
      >
        {/* Visually-hidden accessible title */}
        <SheetTitle className="sr-only">{customer.name}</SheetTitle>
        <SheetDescription className="sr-only">{customer.email}</SheetDescription>

        {/* ── Header ── */}
        <div className="px-6 pt-8 pb-5">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full text-white font-semibold text-base shrink-0 bg-gradient-to-br shadow-sm",
                SEGMENT_AVATAR_COLORS[segment] ?? "from-slate-500 to-slate-600"
              )}
            >
              {getInitials(customer.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[var(--foreground)] truncate">
                  {customer.name}
                </h2>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] font-medium shrink-0",
                    segmentConfig.color,
                    segmentConfig.bgColor
                  )}
                >
                  {t(`segments.${segment}`)}
                </Badge>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] truncate mt-0.5">
                {customer.email}
              </p>
            </div>
          </div>
        </div>

        {/* ── Stamp Progress ── */}
        <div className="px-6 pb-5">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--paper)] p-4">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {t("stampProgress")}
              </p>
              <p className="text-sm tabular-nums">
                <span className="text-lg font-bold text-[var(--foreground)]">
                  {customer.stamps}
                </span>
                <span className="text-[var(--muted-foreground)]">
                  /{maxStamps}
                </span>
              </p>
            </div>
            {/* Progress bar */}
            <div className="h-2.5 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-500 ease-out"
                style={{ width: `${Math.min(stampProgress, 100)}%` }}
              />
            </div>
            {/* Stamp dots */}
            <div className="mt-3">
              <StampProgress count={customer.stamps} total={maxStamps} design={design} size="md" />
            </div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        {currentBusiness && (
          <div className="px-6 pb-5">
            <CustomerQuickActions
              customer={customer}
              businessId={currentBusiness.id}
              maxStamps={maxStamps}
              transactions={transactions}
              onActionComplete={handleActionComplete}
            />
          </div>
        )}

        <div className="px-6">
          <Separator />
        </div>

        {/* ── Stats ── */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <StatItem
              icon={<CalendarBlankIcon size={18} weight="duotone" />}
              label={t("firstVisit")}
              value={formatDate(firstVisit)}
            />
            <StatItem
              icon={<ClockIcon size={18} weight="duotone" />}
              label={t("lastVisit")}
              value={formatDate(lastVisit)}
            />
            <StatItem
              icon={<FootprintsIcon size={18} weight="duotone" />}
              label={t("totalVisits")}
              value={String(totalVisits)}
            />
            <StatItem
              icon={<TrophyIcon size={18} weight="duotone" />}
              label={t("redemptions")}
              value={String(customer.total_redemptions ?? 0)}
            />
          </div>
        </div>

        <div className="px-6">
          <Separator />
        </div>

        {/* ── Recent Activity ── */}
        <div className="px-6 py-6">
          <p className="text-sm font-medium text-[var(--foreground)] mb-5">
            {t("recentActivity")}
          </p>
          <TransactionTimeline
            transactions={transactions}
            loading={query.isLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            loadingMore={loadingMore}
            stampIcon={stampIcon}
            rewardIcon={rewardIcon}
            stampFilledColor={colors?.accentHex}
            iconColor={colors?.iconColorHex}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--background-subtle)] text-[var(--muted-foreground)] shrink-0">
        {icon}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-xs text-[var(--muted-foreground)] mb-0.5">{label}</p>
        <p className="text-base font-semibold text-[var(--foreground)] tabular-nums leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}
