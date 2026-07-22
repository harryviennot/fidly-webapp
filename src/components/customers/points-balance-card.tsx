"use client";

import { useTranslations } from "next-intl";
import { CheckCircle, Circle, Coins } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ProgramSnapshot } from "@/types";

interface PointsBalanceCardProps {
  snapshot: ProgramSnapshot;
}

/**
 * Type-aware progress display for a points customer's detail sheet — the
 * balance headline plus the priced reward ladder (reached rewards are
 * affordable now). Mirrors what the wallet strip shows, driven by the
 * backend's `describe_progress` snapshot.
 */
export function PointsBalanceCard({ snapshot }: PointsBalanceCardProps) {
  const t = useTranslations("customers.detail.points");
  const rewards = snapshot.rewards ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* Balance headline */}
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <Coins className="w-5 h-5 text-[var(--accent)] self-center" weight="duotone" />
          <span className="text-[26px] font-bold tabular-nums leading-none text-[#1A1A1A]">
            {snapshot.display}
          </span>
        </div>
        {snapshot.lifetime != null && (
          <span className="text-[11.5px] text-[#8A8A8A]">
            {t("lifetime", { count: snapshot.lifetime })}
          </span>
        )}
      </div>

      {snapshot.is_complete && (
        <p className="text-[12px] font-semibold text-[var(--accent)]">
          {t("complete")}
          {snapshot.max_limit != null && (
            <span className="font-normal text-[#8A8A8A]"> · {t("limit", { max: snapshot.max_limit })}</span>
          )}
        </p>
      )}

      {/* Reward ladder */}
      {rewards.length > 0 && (
        <div className="flex flex-col divide-y divide-[#EEEDEA]">
          {rewards.map((reward) => (
            <div key={reward.id} className="flex items-center gap-2.5 py-2">
              {reward.reached ? (
                <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" weight="fill" />
              ) : (
                <Circle className="w-4 h-4 text-[#CFCBC4] shrink-0" weight="regular" />
              )}
              <span
                className={cn(
                  "flex-1 text-[13px] truncate",
                  reward.reached ? "text-[#1A1A1A] font-medium" : "text-[#8A8A8A]"
                )}
              >
                {reward.name}
              </span>
              <span
                className={cn(
                  "text-[12px] tabular-nums shrink-0",
                  reward.reached ? "text-[var(--accent)] font-semibold" : "text-[#A5A5A5]"
                )}
              >
                {t("price", { points: reward.threshold })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
