"use client";

import { useTranslations } from "next-intl";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";

interface ActivityEmptyStateProps {
  filtered?: boolean;
}

export function ActivityEmptyState({ filtered }: ActivityEmptyStateProps) {
  const t = useTranslations("activity");

  if (filtered) {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("emptyFiltered")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center py-16">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] mb-4">
        <ClockCounterClockwiseIcon
          size={28}
          weight="duotone"
          className="text-[var(--accent)]"
        />
      </div>
      <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">
        {t("emptyState.title")}
      </h3>
      <p className="text-sm text-[var(--muted-foreground)] max-w-xs">
        {t("emptyState.description")}
      </p>
    </div>
  );
}
