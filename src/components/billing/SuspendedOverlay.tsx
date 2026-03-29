"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { WarningCircle } from "@phosphor-icons/react";

/**
 * Non-blocking banner shown when business is suspended.
 * Dashboard remains accessible (read-only), but this banner
 * is persistent and cannot be dismissed.
 */
export function SuspendedBanner() {
  const t = useTranslations("billing");

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3">
      <div className="flex items-center gap-3 max-w-5xl mx-auto">
        <WarningCircle className="w-5 h-5 text-red-500 shrink-0" weight="fill" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-700">
            {t("suspendedBannerTitle")}
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            {t("suspendedBannerDescription")}
          </p>
        </div>
        <Link
          href="/settings/billing"
          className="shrink-0 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-full transition-colors"
        >
          {t("suspendedBannerCta")}
        </Link>
      </div>
    </div>
  );
}
