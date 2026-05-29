"use client";

import { useTranslations } from "next-intl";
import { AnimatedNumber } from "@/components/redesign";
import type { LocationStatsBatchRow } from "@/types/location";

interface LocationStatsRowProps {
  stats?: LocationStatsBatchRow;
  loading?: boolean;
}

/** Footer stats row on the activity-rich location card.
 *
 *  Three mini-stats — scans, stamps, redemptions over the batch range (30d
 *  for the card grid). Tabular-nums + hairline dividers keep the row tight
 *  and scannable. Skeleton placeholder during initial load. */
export function LocationStatsRow({ stats, loading }: LocationStatsRowProps) {
  const t = useTranslations("loyaltyProgram.locations.card");

  if (loading) {
    return (
      <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center justify-center py-1.5 px-1">
            <div className="h-4 w-8 rounded bg-[var(--muted)] animate-pulse mb-1" />
            <div className="h-2.5 w-12 rounded bg-[var(--muted)] animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
      <Tile value={stats?.total_transactions ?? 0} label={t("scans30d")} />
      <Tile value={stats?.stamps_added ?? 0} label={t("stamps30d")} />
      <Tile value={stats?.rewards_redeemed ?? 0} label={t("redemptions30d")} />
    </div>
  );
}

function Tile({ value, label }: { value: number; label: string }) {
  const isZero = value === 0;
  return (
    <div className="flex flex-col items-center justify-center py-1.5 px-1">
      <span
        className={
          isZero
            ? "text-[15px] font-medium text-[#D4D4D4] tabular-nums leading-none"
            : "text-[15px] font-bold text-[#1A1A1A] tabular-nums leading-none"
        }
      >
        <AnimatedNumber value={value} duration={800} />
      </span>
      <span
        className={
          isZero
            ? "text-[10px] text-[#C8C8C8] mt-1 uppercase tracking-wider"
            : "text-[10px] text-[var(--muted-foreground)] mt-1 uppercase tracking-wider"
        }
      >
        {label}
      </span>
    </div>
  );
}
