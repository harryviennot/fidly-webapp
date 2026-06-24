"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarBlank,
  Clock,
  Footprints,
  Gift,
  Trophy,
  Envelope,
  Phone,
  MapPin,
  PaperPlaneTilt,
  PencilSimple,
  Wallet,
} from "@phosphor-icons/react";
import {
  ResponsiveSidePanel,
  ResponsiveSidePanelHeader,
  ResponsiveSidePanelBody,
} from "@/components/ui/responsive-side-panel";
import { useBusiness } from "@/contexts/business-context";
import { useAuth } from "@/contexts/auth-provider";
import { useEntitlements } from "@/hooks/useEntitlements";
import { getCustomer, getCustomerTransactions, getCustomerWalletStatus } from "@/api";
import {
  classifyCustomer,
  getSegmentConfig,
  SEGMENT_AVATAR_COLORS,
} from "@/lib/customer-segments";
import { CustomerQuickActions } from "./customer-quick-actions";
import { PointsBalanceCard } from "./points-balance-card";
import { SendPassDialog } from "./send-pass-dialog";
import { EditCustomerDialog } from "./edit-customer-dialog";
import { TransactionTimeline } from "./transaction-timeline";
import { StampGridContainer } from "@/components/card";
import { txDelta } from "@/lib/transaction-constants";
import { currencySymbol } from "@/lib/currency";
import { Card } from "@/components/ui/card";
import { computeCardColors } from "@/lib/card-utils";
import { cn } from "@/lib/utils";
import {
  useCustomerTransactions,
  transactionKeys,
} from "@/hooks/use-transactions";
import { customerKeys } from "@/hooks/use-customers";
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
  const { hasFeature } = useEntitlements();
  const t = useTranslations("customers.detail");
  const tSendPass = useTranslations("customers.sendPass");
  const tEditInfo = useTranslations("customers.editInfo");
  const tTime = useTranslations("customers.time");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [sendPassOpen, setSendPassOpen] = useState(false);
  const [editInfoOpen, setEditInfoOpen] = useState(false);

  // Cache the selected customer locally so the panel keeps rendering through
  // its close animation. Parent pages clear `selectedCustomerId` synchronously
  // on dismiss, flipping `customer` to null — without this cache, the panel
  // unmounts before Radix/vaul can play the exit transition.
  const [cachedCustomer, setCachedCustomer] = useState(customer);
  const [prevProp, setPrevProp] = useState(customer);
  if (customer !== prevProp) {
    setPrevProp(customer);
    if (customer) setCachedCustomer(customer);
  }

  const query = useCustomerTransactions(
    currentBusiness?.id,
    customer?.id,
    open && !!customer
  );

  const customerQuery = useQuery({
    queryKey: customerKeys.detail(currentBusiness?.id ?? "", customer?.id ?? ""),
    queryFn: () => getCustomer(currentBusiness!.id, customer!.id),
    enabled: open && !!customer && !!currentBusiness?.id,
    initialData: customer ?? undefined,
  });
  const liveCustomer = customerQuery.data ?? cachedCustomer;

  // Which wallet(s) hold this customer's card. Gated on the live `customer`
  // prop (not the exit-animation cache) so it doesn't fire while closed.
  const walletQuery = useQuery({
    queryKey: customerKeys.walletStatus(
      currentBusiness?.id ?? "",
      customer?.id ?? ""
    ),
    queryFn: () => getCustomerWalletStatus(currentBusiness!.id, customer!.id),
    enabled: open && !!customer && !!currentBusiness?.id,
    staleTime: 60_000,
  });

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

  if (!liveCustomer) return null;

  const snapshot = liveCustomer.program ?? null;
  const isPoints = snapshot?.type === "points";
  const currency = currencySymbol(currentBusiness?.country, currentBusiness?.primary_locale);

  // Points segments come from the server snapshot (reward_ready) rather than
  // the stamp-threshold math, which would misclassify them.
  const segment = isPoints
    ? snapshot?.reward_ready
      ? "reward_ready"
      : "regular"
    : classifyCustomer(liveCustomer, maxStamps);
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

  // Relative ("5 days ago") while it's fresh, then the exact date once it's
  // over a month old \u2014 one clean value per tile instead of cramming both in.
  const formatSmartDate = (dateStr?: string) => {
    if (!dateStr) return "\u2014";
    const diffDays = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays >= 30) return formatDate(dateStr);
    if (diffDays <= 0) return tTime("today");
    if (diffDays === 1) return tTime("yesterday");
    if (diffDays < 7) return tTime("daysAgo", { count: diffDays });
    return tTime("weeksAgo", { count: Math.floor(diffDays / 7) });
  };

  const totalVisits = transactions.filter((txn) => txDelta(txn) > 0).length;

  const firstVisit = liveCustomer.created_at;
  const lastVisit = liveCustomer.last_activity_at ?? liveCustomer.updated_at;

  const wallet = walletQuery.data;
  const walletValue = walletQuery.isLoading
    ? t("wallet.loading")
    : wallet?.apple && wallet?.google
      ? t("wallet.both")
      : wallet?.apple
        ? t("wallet.appleWallet")
        : wallet?.google
          ? t("wallet.googleWallet")
          : t("wallet.notInstalled");
  const colors = design ? computeCardColors(design) : null;
  const stampIcon = (design?.stamp_icon as StampIconType) ?? undefined;
  const rewardIcon = (design?.reward_icon as StampIconType) ?? undefined;

  return (
    <>
    <ResponsiveSidePanel
      open={open}
      onOpenChange={onOpenChange}
      ariaTitle={liveCustomer.name}
      ariaDescription={liveCustomer.email ?? undefined}
    >
      <ResponsiveSidePanelHeader>
        <p className="text-[14px] font-semibold text-[#1A1A1A]">
          {t("customerProfile")}
        </p>
      </ResponsiveSidePanelHeader>

      <ResponsiveSidePanelBody className="pb-[max(4rem,env(safe-area-inset-bottom)+2rem)] md:pb-10">
        {/* ── Centered identity hero ── */}
        <div className="relative px-5 pt-6 pb-5">
          {/* Edit this person's contact details — anchored top-left, mirroring
              the send-card action on the right. */}
          <button
            type="button"
            onClick={() => setEditInfoOpen(true)}
            aria-label={tEditInfo("trigger")}
            className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[12px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
          >
            <PencilSimple className="w-3.5 h-3.5 shrink-0" weight="bold" />
            <span className="hidden min-[380px]:inline">{tEditInfo("short")}</span>
          </button>
          {/* Action about this person — anchored top-right, clear of the panel's
              close button (which lives in the header above). */}
          <button
            type="button"
            onClick={() => setSendPassOpen(true)}
            aria-label={tSendPass("trigger")}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--accent-light)]/40 transition-colors cursor-pointer"
          >
            <PaperPlaneTilt className="w-3.5 h-3.5 shrink-0" weight="bold" />
            <span className="hidden min-[380px]:inline">{tSendPass("short")}</span>
          </button>
          <div className="flex flex-col items-center text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[22px] font-bold mb-2.5"
              style={{ background: avatarColor }}
            >
              {getInitials(liveCustomer.name)}
            </div>
            <h2 className="text-[18px] font-bold text-[#1A1A1A] mb-0.5">
              {liveCustomer.name}
            </h2>
            <div className="flex flex-col items-center gap-1 mb-2">
              <div className="text-[12px] flex items-center gap-1">
                <Envelope className="w-3.5 h-3.5 text-[#BBB]" />
                {liveCustomer.email ? (
                  <span className="text-[#A0A0A0]">{liveCustomer.email}</span>
                ) : (
                  <span className="text-[#BBB] italic">{t("noEmail")}</span>
                )}
              </div>
              {/* Phone sits below email in the same style. Only shown when the
                  business collected one — no "no phone" placeholder, since
                  most businesses don't collect it at all. */}
              {liveCustomer.phone && (
                <div className="text-[12px] flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#BBB]" />
                  <span className="text-[#A0A0A0]">{liveCustomer.phone}</span>
                </div>
              )}
            </div>
            <span
              className="text-[11px] px-3 py-0.5 rounded-full font-semibold"
              style={{ background: segConfig.bg, color: segConfig.color }}
            >
              {t(`segments.${segment}`)}
            </span>
          </div>
        </div>

        {/* ── Progress (stamp grid or points balance) ── */}
        <div className="px-5 pb-4">
          <div className="bg-[#FAFAF8] rounded-xl border border-[#EEEDEA] px-4 py-3.5">
            <p className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-2.5">
              {isPoints ? t("points.title") : t("stampProgress")}
            </p>
            {isPoints && snapshot ? (
              <PointsBalanceCard snapshot={snapshot} />
            ) : (
              colors && (
                <StampGridContainer
                  totalStamps={maxStamps}
                  filledCount={liveCustomer.stamps}
                  colors={colors}
                  stampIcon={stampIcon ?? "checkmark"}
                  rewardIcon={rewardIcon ?? "gift"}
                  maxWidth={360}
                />
              )
            )}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        {currentBusiness && (
          <div className="px-5 pb-4">
            <CustomerQuickActions
              customer={liveCustomer}
              businessId={currentBusiness.id}
              maxStamps={maxStamps}
              transactions={transactions}
              onActionComplete={handleActionComplete}
              snapshot={snapshot}
              currency={currency}
            />
          </div>
        )}

        {/* ── Stats ── */}
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-2.5">
            {t("customerStats")}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile
              icon={<Clock className="w-4 h-4" weight="bold" />}
              label={t("lastVisit")}
              value={formatSmartDate(lastVisit)}
              iconBg="var(--muted)"
              iconColor="var(--muted-foreground)"
            />
            <StatTile
              icon={<CalendarBlank className="w-4 h-4" weight="bold" />}
              label={t("customerSince")}
              value={formatSmartDate(firstVisit)}
              iconBg="var(--info-light)"
              iconColor="var(--info)"
            />
            <StatTile
              icon={<Footprints className="w-4 h-4" weight="bold" />}
              label={t("totalVisits")}
              value={String(totalVisits)}
              iconBg="var(--accent-light)"
              iconColor="var(--accent)"
              valueColor="#4A7C59"
            />
            <StatTile
              icon={<Trophy className="w-4 h-4" weight="bold" />}
              label={t("redemptions")}
              value={String(liveCustomer.total_redemptions ?? 0)}
              iconBg="var(--warning-light)"
              iconColor="var(--warning)"
              valueColor="#C4883D"
            />
            {/* Stackable rewards: banked (earned, unredeemed) count. Only
                shown when the customer actually holds some — businesses
                without stacking never see the tile. */}
            {(liveCustomer.rewards ?? 0) > 0 && (
              <StatTile
                className="col-span-2"
                icon={<Gift className="w-4 h-4" weight="bold" />}
                label={t("rewardsAvailable")}
                value={String(liveCustomer.rewards)}
                iconBg="var(--warning-light)"
                iconColor="var(--warning)"
                valueColor="#C4883D"
              />
            )}
            <StatTile
              className="col-span-2"
              icon={<Wallet className="w-4 h-4" weight="bold" />}
              label={t("wallet.label")}
              value={walletValue}
              iconBg="var(--muted)"
              iconColor="var(--muted-foreground)"
            />
            {hasFeature("locations.multiple") && (
              <StatTile
                className="col-span-2"
                icon={<MapPin className="w-4 h-4" weight="bold" />}
                label={t("enrolledAt")}
                value={
                  liveCustomer.enrolled_at_location_name ?? t("directSignup")
                }
                iconBg="var(--muted)"
                iconColor="var(--muted-foreground)"
              />
            )}
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
      </ResponsiveSidePanelBody>
    </ResponsiveSidePanel>

    {currentBusiness && (
      <SendPassDialog
        open={sendPassOpen}
        onOpenChange={setSendPassOpen}
        customerId={liveCustomer.id}
        customerName={liveCustomer.name}
        currentEmail={liveCustomer.email}
        businessId={currentBusiness.id}
        onSuccess={() => customerQuery.refetch()}
      />
    )}

    {currentBusiness && (
      <EditCustomerDialog
        open={editInfoOpen}
        onOpenChange={setEditInfoOpen}
        customerId={liveCustomer.id}
        currentName={liveCustomer.name}
        currentEmail={liveCustomer.email}
        currentPhone={liveCustomer.phone}
        businessId={currentBusiness.id}
        onSuccess={() => customerQuery.refetch()}
      />
    )}
    </>
  );
}

function StatTile({
  icon,
  label,
  value,
  iconBg,
  iconColor,
  valueColor,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  className?: string;
}) {
  return (
    <Card flat className={cn("flex items-center gap-2.5 px-3 py-2.5", className)}>
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-[#8A8A8A] truncate">{label}</div>
        <div
          className="text-[15px] font-semibold leading-tight truncate"
          style={{ color: valueColor || "#1A1A1A" }}
        >
          {value}
        </div>
      </div>
    </Card>
  );
}
