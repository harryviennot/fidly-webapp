"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Clock, WarningCircle, Info } from "@phosphor-icons/react";
import { useBillingStatus } from "@/hooks/useBilling";

export function TrialBanner() {
  const t = useTranslations("billing");
  const {
    isTrialing,
    isGrace,
    isPastDue,
    daysRemaining,
    isActiveInTrial,
    daysUntilFirstCharge,
  } = useBillingStatus();

  // State B: Subscribed during trial — only show soft reminder when ≤3 days until first charge
  if (isActiveInTrial) {
    if (daysUntilFirstCharge === null || daysUntilFirstCharge > 3) return null;
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-50 text-blue-700 border-b border-blue-100">
        <Info className="w-4 h-4 shrink-0" weight="fill" />
        <span>{t("billingStartsSoon", { days: daysUntilFirstCharge })}</span>
      </div>
    );
  }

  // State A: Trial without subscription, or grace/past_due
  if (!isTrialing && !isGrace && !isPastDue) return null;

  const isUrgent = isGrace || isPastDue || (daysRemaining !== null && daysRemaining <= 3);

  return (
    <Link
      href="/settings/billing"
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        isUrgent
          ? "bg-red-50 text-red-700 hover:bg-red-100 border-b border-red-100"
          : "bg-amber-50 text-amber-700 hover:bg-amber-100 border-b border-amber-100"
      }`}
    >
      {isUrgent ? (
        <WarningCircle className="w-4 h-4 shrink-0" weight="fill" />
      ) : (
        <Clock className="w-4 h-4 shrink-0" weight="fill" />
      )}
      <span>
        {isGrace
          ? t("graceBanner")
          : isPastDue
            ? t("pastDueBanner")
            : daysRemaining !== null
              ? t("trialBanner", { days: daysRemaining })
              : t("trialBannerGeneric")}
      </span>
      <span className="ml-auto text-xs font-semibold underline underline-offset-2">
        {t("viewPlans")}
      </span>
    </Link>
  );
}
