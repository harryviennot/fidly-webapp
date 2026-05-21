"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface LocationActivityChipProps {
  /** ISO timestamp of the most recent transaction at this location within
   *  the batch range (typically 7d). Null when there's been no activity. */
  lastActivityAt: string | null | undefined;
  className?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Activity status chip on the location card.
 *
 *  - Active today: any transaction in the last 24h (green).
 *  - Quiet 7d+: no activity in 7 days or more (amber). When this is rendered
 *    from a 7d-range batch, a missing/null `last_activity_at` directly maps
 *    to "no activity in the last 7d" → Quiet 7d+.
 *  - Otherwise: nothing rendered (returns null) — avoids noise on normal
 *    slow days where a store had recent but not last-24h activity.
 */
export function LocationActivityChip({
  lastActivityAt,
  className,
}: LocationActivityChipProps) {
  const t = useTranslations("loyaltyProgram.locations.card");
  // Lazy-init "now" at mount — keeps the chip deterministic across renders.
  const [now] = useState(() => Date.now());

  if (!lastActivityAt) {
    return (
      <Chip
        dotClassName="bg-amber-500"
        labelClassName="text-amber-700"
        bgClassName="bg-amber-50 border-amber-100"
        label={t("activityQuiet")}
        className={className}
      />
    );
  }

  const ts = Date.parse(lastActivityAt);
  if (Number.isNaN(ts)) return null;
  const ageMs = now - ts;

  if (ageMs < DAY_MS) {
    return (
      <Chip
        dotClassName="bg-emerald-500"
        labelClassName="text-emerald-700"
        bgClassName="bg-emerald-50 border-emerald-100"
        label={t("activityActive")}
        className={className}
      />
    );
  }
  if (ageMs >= 7 * DAY_MS) {
    return (
      <Chip
        dotClassName="bg-amber-500"
        labelClassName="text-amber-700"
        bgClassName="bg-amber-50 border-amber-100"
        label={t("activityQuiet")}
        className={className}
      />
    );
  }
  return null;
}

function Chip({
  dotClassName,
  labelClassName,
  bgClassName,
  label,
  className,
}: {
  dotClassName: string;
  labelClassName: string;
  bgClassName: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium",
        bgClassName,
        labelClassName,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClassName)} />
      {label}
    </span>
  );
}
