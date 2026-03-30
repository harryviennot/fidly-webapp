"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { WarningIcon, XIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { useOverLimit } from "@/hooks/useBilling";
import { useBusiness } from "@/contexts/business-context";
import { cn } from "@/lib/utils";

const DISMISS_KEY_PREFIX = "over_limit_dismissed_";

function getDismissKey(businessId: string, resourceHash: string) {
  return `${DISMISS_KEY_PREFIX}${businessId}_${resourceHash}`;
}

function isDismissed(businessId: string, resourceHash: string): boolean {
  try {
    return localStorage.getItem(getDismissKey(businessId, resourceHash)) === "1";
  } catch {
    return false;
  }
}

function setDismissed(businessId: string, resourceHash: string) {
  try {
    localStorage.setItem(getDismissKey(businessId, resourceHash), "1");
  } catch {
    // localStorage unavailable
  }
}

export function OverLimitBanner() {
  const { currentBusiness } = useBusiness();
  const { data, isLoading } = useOverLimit();
  const t = useTranslations("features.overLimit");
  const tTiers = useTranslations("features.tiers");

  // Compute a hash of the over-limit state so banner reappears if situation changes
  const resourceHash = data
    ? [...Object.keys(data.resources)].toSorted((a, b) => a.localeCompare(b)).join(",") + "|" + [...data.features_lost].toSorted((a, b) => a.localeCompare(b)).join(",")
    : "";

  const [dismissed, setDismissedState] = useState(() =>
    currentBusiness?.id ? isDismissed(currentBusiness.id, resourceHash) : false
  );

  const handleDismiss = () => {
    if (currentBusiness?.id) {
      setDismissed(currentBusiness.id, resourceHash);
    }
    setDismissedState(true);
  };

  if (isLoading || !data?.is_over_limit || dismissed) {
    return null;
  }

  const tier = currentBusiness?.subscription_tier ?? "starter";
  const tierLabel = tTiers(tier);

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-4 py-2.5",
        "bg-amber-50 border-b border-amber-200 text-amber-900",
        "text-sm"
      )}
    >
      <WarningIcon className="w-4 h-4 shrink-0 text-amber-600" weight="fill" />

      <p className="flex-1 min-w-0">
        {t("banner", { tier: tierLabel })}
      </p>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/billing"
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
        >
          {t("bannerUpgrade")}
          <ArrowRightIcon className="w-3 h-3" />
        </Link>

        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-amber-100 transition-colors text-amber-500 hover:text-amber-700"
          aria-label="Dismiss"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
