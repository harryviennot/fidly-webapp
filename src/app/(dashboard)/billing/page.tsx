"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, ArrowSquareOut, WarningCircle, Clock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { InfoBox } from "@/components/reusables/info-box";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/redesign";
import {
  useBillingStatus,
  useCheckout,
  usePortalSession,
  useChangeTier,
  useCancelSubscription,
  useReactivateSubscription,
} from "@/hooks/useBilling";
import { BillingPageSkeleton } from "@/components/billing/BillingPageSkeleton";

const TIERS = ["starter", "growth", "pro"] as const;

const TIER_RANK: Record<string, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
};

const TIER_PRICES: Record<string, number> = {
  starter: 20,
  growth: 40,
  pro: 60,
};

const FOUNDING_PRICES: Record<string, number> = {
  starter: 10,
  growth: 20,
  pro: 30,
};

const FEATURE_LABELS: Record<string, string> = {
  starter: "starterLabel",
  growth: "growthLabel",
  pro: "proLabel",
};

function TierCard({
  tier,
  currentTier,
  isFoundingPartner,
  isSuspended,
  isTrialing,
  hasSubscription,
  onSubscribe,
  onChangeTier,
  isLoading,
  delay = 0,
}: {
  tier: string;
  currentTier: string;
  isFoundingPartner: boolean;
  isSuspended: boolean;
  isTrialing: boolean;
  hasSubscription: boolean;
  onSubscribe: (tier: string) => void;
  onChangeTier: (tier: string) => void;
  isLoading: boolean;
  delay?: number;
}) {
  const t = useTranslations("billing");
  const isCurrent = tier === currentTier;
  const isPro = tier === "pro";
  const needsSubscription = (isTrialing || isSuspended) && !hasSubscription;
  const price = isFoundingPartner
    ? FOUNDING_PRICES[tier]
    : TIER_PRICES[tier];

  const features = t.raw(`features.${tier}`) as string[];
  const featuresLabel = t(`features.${FEATURE_LABELS[tier]}`);

  const renderButton = () => {
    if (isPro) {
      return (
        <Button variant="outline" className="w-full rounded-full" disabled>
          {t("comingSoon")}
        </Button>
      );
    }

    // No payment linked
    if (needsSubscription) {
      if (isCurrent) {
        return (
          <Button
            variant="gradient"
            className="w-full rounded-full"
            onClick={() => onSubscribe(tier)}
            disabled={isLoading}
          >
            {t("payNow")}
          </Button>
        );
      }
      return (
        <Button
          variant="outline"
          className="w-full rounded-full"
          onClick={() => onSubscribe(tier)}
          disabled={isLoading}
        >
          {t("switchToThisPlan")}
        </Button>
      );
    }

    // Payment linked
    if (isCurrent && hasSubscription) {
      return (
        <Button variant="outline" className="w-full rounded-full" disabled>
          {t("currentPlan")}
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        className="w-full rounded-full"
        onClick={() => onChangeTier(tier)}
        disabled={isLoading}
      >
        {t("switchToThisPlan")}
      </Button>
    );
  };

  return (
    <div
      className={`relative flex flex-col bg-[var(--card)] rounded-xl border border-[var(--border)] animate-slide-up ${
        isPro
          ? "opacity-50"
          : isCurrent
            ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
            : ""
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] whitespace-nowrap">
            {t("comingSoon")}
          </span>
        </div>
      )}

      <div className="p-6 pb-2">
        <h3 className={`text-lg font-semibold capitalize ${isPro ? "text-[var(--muted-foreground)]" : ""}`}>
          {tier}
        </h3>
        <div className="flex items-baseline gap-1 mt-1">
          <span className={`text-3xl font-extrabold ${isPro ? "text-[var(--muted-foreground)]" : ""}`}>
            &euro;{price}
          </span>
          <span className="text-sm text-[var(--muted-foreground)]">{t("perMonth")}</span>
        </div>
        {isFoundingPartner && !isPro && (
          <span className="text-xs text-[var(--accent)] font-semibold">
            {t("foundingPrice")}
          </span>
        )}
      </div>

      <div className="flex-1 px-6 pt-2">
        <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">{featuresLabel}</p>
        <ul className="space-y-1.5">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
              <Check className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" weight="bold" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-6 pt-4">
        {renderButton()}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const t = useTranslations("billing");
  const searchParams = useSearchParams();
  const {
    data,
    isLoading,
    isTrialing,
    isGrace,
    isActive,
    isPastDue,
    isCancelled,
    isSuspended,
    daysRemaining,
    isFoundingPartner,
    hasSubscription,
    isActiveInTrial,
    daysUntilFirstCharge,
  } = useBillingStatus();

  const checkout = useCheckout();
  const portal = usePortalSession();
  const cancelSub = useCancelSubscription();
  const reactivate = useReactivateSubscription();

  const currentTier = data?.tier || "starter";

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success(t("checkoutSuccess"));
    }
  }, [searchParams, t]);

  const changeTier = useChangeTier();
  const [confirmTier, setConfirmTier] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const isUpgrade = confirmTier
    ? (TIER_RANK[confirmTier] ?? 0) > (TIER_RANK[currentTier] ?? 0)
    : false;

  const handleSubscribe = (tier: string) => {
    checkout.mutate({
      tier,
      successUrl: `${window.location.origin}/billing?success=true`,
      cancelUrl: `${window.location.origin}/billing`,
    });
  };

  const handleChangeTier = (tier: string) => {
    setConfirmTier(tier);
  };

  const confirmChangeTier = () => {
    if (!confirmTier) return;
    changeTier.mutate(confirmTier, {
      onSuccess: () => {
        toast.success(t("tierChanged"));
        setConfirmTier(null);
      },
      onError: (err: Error) => {
        toast.error(err.message);
        setConfirmTier(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8 pb-12">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <BillingPageSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          hasSubscription
            ? [
                {
                  label: t("manageBilling"),
                  icon: <ArrowSquareOut className="w-4 h-4" />,
                  onClick: () => portal.mutate(),
                  variant: "secondary" as const,
                  disabled: portal.isPending,
                },
              ]
            : undefined
        }
      />

      {/* Status banners */}
      {isPastDue && (
        <div className="flex items-center gap-3">
          <InfoBox
            variant="error"
            icon={<CreditCard className="w-4 h-4 text-[var(--error)]" weight="fill" />}
            title={t("pastDueTitle")}
            message={t("pastDueDescription")}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
          >
            {t("updatePayment")}
          </Button>
        </div>
      )}

      {isGrace && (
        <InfoBox
          variant="warning"
          icon={<WarningCircle className="w-4 h-4 text-[var(--warning)]" weight="fill" />}
          title={t("graceTitle")}
          message={t("graceDescription")}
        />
      )}

      {/* Active subscription info */}
      {(isActive || isCancelled) && (
        <div
          className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 animate-slide-up"
          style={{ animationDelay: "0ms" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold capitalize">{currentTier}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {isCancelled
                  ? t("cancelledUntil", {
                      date: data?.billing_period_end
                        ? new Date(data.billing_period_end).toLocaleDateString()
                        : "—",
                    })
                  : data?.billing_period_end
                    ? t("nextBilling", {
                        date: new Date(data.billing_period_end).toLocaleDateString(),
                      })
                    : ""}
              </p>
              {isFoundingPartner && (
                <span className="inline-flex items-center text-xs font-semibold text-[var(--accent)] bg-[var(--accent)]/10 px-2.5 py-1 rounded-full mt-2">
                  {t("foundingPartner")}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {isCancelled ? (
                <Button
                  variant="gradient"
                  size="sm"
                  className="rounded-full"
                  onClick={() => reactivate.mutate()}
                  disabled={reactivate.isPending}
                >
                  {t("reactivate")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-[var(--error)] border-[var(--error)]/20 hover:bg-[var(--error-light)]"
                  onClick={() => setShowCancelDialog(true)}
                >
                  {t("cancel")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trial info — compact */}
      {(isTrialing || isGrace) && !hasSubscription && daysRemaining !== null && (
        <InfoBox
          variant="info"
          icon={<Clock className="w-4 h-4 text-[var(--info)]" weight="fill" />}
          message={t("trialInfoCompact", { days: daysRemaining })}
        />
      )}

      {/* Subscribed during trial — soft info */}
      {isActiveInTrial && daysUntilFirstCharge !== null && (
        <InfoBox
          variant="info"
          icon={<Check className="w-4 h-4 text-[var(--info)]" weight="bold" />}
          message={t("activeInTrialInfo", { days: daysUntilFirstCharge })}
        />
      )}

      {/* Plan selection */}
      <div className="space-y-4 animate-slide-up" style={{ animationDelay: "80ms" }}>
        <h2 className="text-lg font-bold">
          {isTrialing || isSuspended || isGrace ? t("choosePlan") : t("changePlan")}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {TIERS.map((tier, i) => (
            <TierCard
              key={tier}
              tier={tier}
              delay={160 + i * 80}
              currentTier={currentTier}
              isFoundingPartner={isFoundingPartner}
              isSuspended={isSuspended}
              isTrialing={isTrialing || isGrace}
              hasSubscription={hasSubscription}
              onSubscribe={handleSubscribe}
              onChangeTier={handleChangeTier}
              isLoading={checkout.isPending || changeTier.isPending}
            />
          ))}
        </div>
      </div>

      {/* Invoice section */}
      {hasSubscription && (
        <div
          className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 animate-slide-up"
          style={{ animationDelay: "400ms" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">{t("invoiceHistory")}</h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                {t("invoiceHistoryDescription")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full shrink-0"
              onClick={() => portal.mutate()}
              disabled={portal.isPending}
            >
              <ArrowSquareOut className="w-4 h-4" />
              {t("viewInvoices")}
            </Button>
          </div>
        </div>
      )}

      {/* Tier change confirmation dialog */}
      <AlertDialog open={!!confirmTier} onOpenChange={(open) => !open && setConfirmTier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isUpgrade
                ? t("confirmUpgradeTitle", { to: confirmTier ?? "" })
                : t("confirmDowngradeTitle", { to: confirmTier ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isUpgrade
                ? t("confirmUpgradeDescription", {
                    from: currentTier,
                    to: confirmTier ?? "",
                    fromPrice: isFoundingPartner ? FOUNDING_PRICES[currentTier] : TIER_PRICES[currentTier],
                    toPrice: confirmTier ? (isFoundingPartner ? FOUNDING_PRICES[confirmTier] : TIER_PRICES[confirmTier]) : 0,
                  })
                : t("confirmDowngradeDescription", {
                    from: currentTier,
                    to: confirmTier ?? "",
                  })}
            </AlertDialogDescription>
            {(isTrialing || isGrace) && !hasSubscription && data?.trial_ends_at && (
              <InfoBox
                variant="note"
                message={t("trialPlanSwitchNote", {
                  date: new Date(data.trial_ends_at).toLocaleDateString(),
                })}
                className="mt-3"
              />
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("confirmCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmChangeTier}
              disabled={changeTier.isPending}
            >
              {changeTier.isPending
                ? t("redirecting")
                : isUpgrade
                  ? t("confirmUpgrade")
                  : t("confirmDowngrade")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel subscription confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmCancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmCancelDescription", {
                plan: currentTier,
                date: data?.billing_period_end
                  ? new Date(data.billing_period_end).toLocaleDateString()
                  : t("endOfPeriod"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("confirmCancelKeep")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--error)] hover:bg-[var(--error)]/90"
              onClick={() => {
                cancelSub.mutate(undefined, {
                  onSuccess: () => {
                    toast.success(t("cancelSuccess"));
                    setShowCancelDialog(false);
                  },
                  onError: (err: Error) => {
                    toast.error(err.message);
                    setShowCancelDialog(false);
                  },
                });
              }}
              disabled={cancelSub.isPending}
            >
              {cancelSub.isPending ? t("redirecting") : t("confirmCancelButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
