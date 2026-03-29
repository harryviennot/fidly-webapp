"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { WarningCircleIconIcon, ArrowRightIcon } from "@phosphor-icons/react";

/**
 * Non-blocking banner shown when business is suspended.
 * Dashboard remains accessible (read-only), but this banner
 * is persistent and cannot be dismissed.
 */
export function SuspendedBanner() {
  const t = useTranslations("billing");

  return (
    <div className="bg-[var(--error-light)] border-b border-[var(--error)]/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <WarningCircleIcon className="w-5 h-5 text-[var(--error)] shrink-0" weight="fill" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--error)]">
            {t("suspendedBannerTitle")}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {t("suspendedBannerDescription")}
          </p>
        </div>
        <Link
          href="/billing"
          className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-[var(--error)] underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          {t("suspendedBannerCta")}
          <ArrowRightIcon className="w-3.5 h-3.5" weight="bold" />
        </Link>
      </div>
    </div>
  );
}
