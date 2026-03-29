"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
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
}) {
  const t = useTranslations("billing");
  const isCurrent = tier === currentTier;
  const isHighlighted = tier === "growth";
  const isPro = tier === "pro";
  const needsSubscription = (isTrialing || isSuspended) && !hasSubscription;
  const price = isFoundingPartner
    ? FOUNDING_PRICES[tier]
    : TIER_PRICES[tier];

  return (
    <div
      className={`relative rounded-2xl border p-6 transition-all ${
        isPro
          ? "border-gray-200 opacity-50"
          : isCurrent
            ? "border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]"
            : isHighlighted
              ? "border-gray-200 shadow-md"
              : "border-gray-200"
      }`}
    >
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-200 text-gray-500 whitespace-nowrap">
            {t("comingSoon")}
          </span>
        </div>
      )}
      {isHighlighted && !isCurrent && !isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--accent)] text-white">
            {t("popular")}
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className={`text-lg font-bold capitalize ${isPro ? "text-gray-400" : ""}`}>{tier}</h3>
        <div className="flex items-baseline gap-1 mt-1">
          <span className={`text-3xl font-extrabold ${isPro ? "text-gray-400" : ""}`}>&euro;{price}</span>
          <span className="text-sm text-gray-500">{t("perMonth")}</span>
        </div>
        {isFoundingPartner && !isPro && (
          <span className="text-xs text-[var(--accent)] font-semibold">
            {t("foundingPrice")}
          </span>
        )}
      </div>

      {isPro ? (
        <Button variant="outline" className="w-full rounded-full" disabled>
          {t("comingSoon")}
        </Button>
      ) : needsSubscription && isCurrent ? (
        /* Trial, no subscription, current tier → "Link payment method" */
        <Button
          variant="gradient"
          className="w-full rounded-full"
          onClick={() => onSubscribe(tier)}
          disabled={isLoading}
        >
          {t("subscribe")}
        </Button>
      ) : needsSubscription && !isCurrent ? (
        /* Trial, no subscription, different tier → "Switch & link payment" */
        <div className="space-y-2">
          <Button
            variant={isHighlighted ? "gradient" : "outline"}
            className="w-full rounded-full"
            onClick={() => onSubscribe(tier)}
            disabled={isLoading}
          >
            {(TIER_RANK[tier] ?? 0) > (TIER_RANK[currentTier] ?? 0) ? t("upgrade") : t("switchPlan")}
          </Button>
          <p className="text-[11px] text-gray-400 text-center">{t("trialSwitchHint")}</p>
        </div>
      ) : isCurrent && hasSubscription ? (
        <div className="flex items-center gap-2 text-sm text-[var(--accent)] font-semibold">
          <Check className="w-4 h-4" weight="bold" />
          {t("currentPlan")}
        </div>
      ) : (
        /* Active subscriber changing tier → upgrade/downgrade via subscription modify */
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full rounded-full"
            onClick={() => onChangeTier(tier)}
            disabled={isLoading}
          >
            {(TIER_RANK[tier] ?? 0) > (TIER_RANK[currentTier] ?? 0) ? t("upgrade") : t("downgrade")}
          </Button>
          <p className="text-[11px] text-gray-400 text-center">{t("prorationHint")}</p>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const t = useTranslations("billing");
  const searchParams = useSearchParams();
  const {
    data,
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

  // Show success toast after Stripe redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success(t("checkoutSuccess"));
    }
  }, [searchParams, t]);

  const changeTier = useChangeTier();
  const [confirmTier, setConfirmTier] = useState<string | null>(null);

  const isUpgrade = confirmTier
    ? (TIER_RANK[confirmTier] ?? 0) > (TIER_RANK[currentTier] ?? 0)
    : false;

  const handleSubscribe = (tier: string) => {
    checkout.mutate({
      tier,
      successUrl: `${window.location.origin}/settings/billing?success=true`,
      cancelUrl: `${window.location.origin}/settings/billing`,
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

  return (
    <div className="space-y-8 pb-12">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {/* Status banner */}
      {isPastDue && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-red-500 shrink-0" weight="fill" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">{t("pastDueTitle")}</p>
            <p className="text-sm text-red-600">{t("pastDueDescription")}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-red-300 text-red-700"
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
          >
            {t("updatePayment")}
          </Button>
        </div>
      )}

      {isGrace && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm font-semibold text-amber-700">{t("graceTitle")}</p>
          <p className="text-sm text-amber-600">{t("graceDescription")}</p>
        </div>
      )}

      {/* Active subscription info */}
      {(isActive || isCancelled) && (
        <div className="rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold capitalize">{currentTier}</h3>
              <p className="text-sm text-gray-500">
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
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
              >
                <ArrowSquareOut className="w-4 h-4 mr-1" />
                {t("manageBilling")}
              </Button>
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
                  className="rounded-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => cancelSub.mutate()}
                  disabled={cancelSub.isPending}
                >
                  {t("cancel")}
                </Button>
              )}
            </div>
          </div>
          {isFoundingPartner && (
            <span className="inline-flex items-center text-xs font-semibold text-[var(--accent)] bg-[var(--accent)]/10 px-2.5 py-1 rounded-full">
              {t("foundingPartner")}
            </span>
          )}
        </div>
      )}

      {/* Trial info — not yet subscribed */}
      {(isTrialing || isGrace) && !hasSubscription && daysRemaining !== null && (
        <div className="rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">{t("trialRemaining")}</p>
          <p className="text-4xl font-extrabold text-gray-900">
            {daysRemaining}
          </p>
          <p className="text-sm text-gray-500">{t("daysLeft")}</p>
          <p className="text-xs text-gray-400 mt-3 max-w-sm mx-auto">
            {t("trialSubscribeHint")}
          </p>
        </div>
      )}

      {/* Subscribed during trial — soft info */}
      {isActiveInTrial && daysUntilFirstCharge !== null && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
          <p className="text-sm text-blue-600 font-medium">
            {t("activeInTrialInfo", { days: daysUntilFirstCharge })}
          </p>
        </div>
      )}

      {/* Plan selection */}
      <div>
        <h2 className="text-lg font-bold mb-4">
          {isTrialing || isSuspended || isGrace ? t("choosePlan") : t("changePlan")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <TierCard
              key={tier}
              tier={tier}
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

      {/* Tier change confirmation dialog */}
      <AlertDialog open={!!confirmTier} onOpenChange={(open) => !open && setConfirmTier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isUpgrade ? t("confirmUpgradeTitle") : t("confirmDowngradeTitle")}
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
    </div>
  );
}
