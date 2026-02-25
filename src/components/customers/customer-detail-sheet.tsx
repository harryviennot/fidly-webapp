"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarBlank,
  Clock,
  Footprints,
  Trophy,
  Envelope,
} from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useBusiness } from "@/contexts/business-context";
import { useAuth } from "@/contexts/auth-provider";
import { getCustomerTransactions } from "@/api";
import {
  classifyCustomer,
  getSegmentConfig,
  SEGMENT_AVATAR_COLORS,
} from "@/lib/customer-segments";
import { CustomerQuickActions } from "./customer-quick-actions";
import { TransactionTimeline } from "./transaction-timeline";
import { StampGridContainer } from "@/components/card";
import { computeCardColors } from "@/lib/card-utils";
import {
  useCustomerTransactions,
  transactionKeys,
} from "@/hooks/use-transactions";
import type { CustomerResponse, TransactionResponse } from "@/types";
import type { CardDesign } from "@/types/design";
import type { StampIconType } from "@/components/design/StampIconPicker";

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

export function CustomerDetailSheet({
  customer,
  open,
  onOpenChange,
  maxStamps,
  design,
}: CustomerDetailSheetProps) {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
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
  const segConfig = getSegmentConfig(segment);
  const avatarColor = SEGMENT_AVATAR_COLORS[segment];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const totalVisits = transactions.filter(
    (txn) => txn.stamp_delta > 0
  ).length;

  const firstVisit = customer.created_at;
  const lastVisit = customer.last_activity_at ?? customer.updated_at;
  const colors = design ? computeCardColors(design) : null;
  const stampIcon = (design?.stamp_icon as StampIconType) ?? undefined;
  const rewardIcon = (design?.reward_icon as StampIconType) ?? undefined;
  const isMax = customer.stamps >= maxStamps;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-[440px] overflow-y-auto p-0 gap-0"
      >
        <SheetTitle className="sr-only">{customer.name}</SheetTitle>
        <SheetDescription className="sr-only">{customer.email}</SheetDescription>

        {/* ── Header ── */}
        <div className="px-5 pt-6 pb-5">
          <p className="text-[14px] font-semibold text-[#1A1A1A] mb-5">
            {t("stampProgress").replace("Stamp Progress", "Customer Profile")}
          </p>

          {/* Centered avatar + info */}
          <div className="flex flex-col items-center text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[22px] font-bold mb-2.5"
              style={{ background: avatarColor }}
            >
              {getInitials(customer.name)}
            </div>
            <h2 className="text-[18px] font-bold text-[#1A1A1A] mb-0.5">
              {customer.name}
            </h2>
            <div className="text-[12px] text-[#A0A0A0] mb-2 flex items-center gap-1">
              <Envelope className="w-3.5 h-3.5 text-[#BBB]" />
              {customer.email}
            </div>
            <span
              className="text-[11px] px-3 py-0.5 rounded-full font-semibold"
              style={{ background: segConfig.bg, color: segConfig.color }}
            >
              {t(`segments.${segment}`)}
            </span>
          </div>
        </div>

        {/* ── Stamp Progress ── */}
        <div className="px-5 pb-4">
          <div className="bg-[#FAFAF8] rounded-xl border border-[#EEEDEA] px-4 py-3.5">
            <p className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-2.5">
              {t("stampProgress")}
            </p>
            {colors && (
              <StampGridContainer
                totalStamps={maxStamps}
                filledCount={customer.stamps}
                colors={colors}
                stampIcon={stampIcon ?? "checkmark"}
                rewardIcon={rewardIcon ?? "gift"}
              />
            )}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        {currentBusiness && (
          <div className="px-5 pb-4">
            <CustomerQuickActions
              customer={customer}
              businessId={currentBusiness.id}
              maxStamps={maxStamps}
              transactions={transactions}
              onActionComplete={handleActionComplete}
            />
          </div>
        )}

        {/* ── Stats ── */}
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-1">
            Customer Stats
          </p>
          <div className="divide-y divide-[#F8F7F5]">
            <StatRow
              icon={<CalendarBlank className="w-4 h-4" />}
              label={t("firstVisit")}
              value={formatDate(firstVisit)}
            />
            <StatRow
              icon={<Clock className="w-4 h-4" />}
              label={t("lastVisit")}
              value={formatDate(lastVisit)}
            />
            <StatRow
              icon={<Footprints className="w-4 h-4" />}
              label={t("totalVisits")}
              value={String(totalVisits)}
              accent="#4A7C59"
            />
            <StatRow
              icon={<Trophy className="w-4 h-4" />}
              label={t("redemptions")}
              value={String(customer.total_redemptions ?? 0)}
              accent="#C4883D"
            />
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div className="px-5 py-4 border-t border-[#F0EFEB]">
          <p className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-3">
            {t("recentActivity")}
          </p>
          <TransactionTimeline
            transactions={transactions}
            loading={query.isLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            loadingMore={loadingMore}
            currentUserId={user?.id}
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

function StatRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-2.5">
      <span className="text-[#B0B0B0] flex shrink-0">{icon}</span>
      <span className="flex-1 text-[12px] text-[#8A8A8A]">{label}</span>
      <span
        className="text-[13px] font-semibold"
        style={{ color: accent || "#1A1A1A" }}
      >
        {value}
      </span>
    </div>
  );
}
