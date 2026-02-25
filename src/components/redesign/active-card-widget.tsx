"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { WalletCard } from "@/components/card";
import { ScaledCardWrapper } from "@/components/design/ScaledCardWrapper";
import type { CardDesign } from "@/types";

interface ActiveCardWidgetProps {
  design: CardDesign | null | undefined;
  totalCustomers: number;
  activeCards: number;
  className?: string;
  delay?: number;
}

export function ActiveCardWidget({
  design,
  totalCustomers,
  activeCards,
  className,
  delay = 0,
}: ActiveCardWidgetProps) {
  const t = useTranslations("dashboard");

  const installRate = totalCustomers > 0
    ? ((activeCards / totalCustomers) * 100).toFixed(1)
    : "0.0";

  return (
    <div
      className={cn(
        "bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px] animate-slide-up",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header: title + edit link */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-semibold text-[#1A1A1A]">
          {t("activeCard")}
        </h3>
        {design && (
          <Link
            href={`/design/${design.id}`}
            className="text-xs text-[var(--accent)] font-medium hover:underline"
          >
            {t("edit")}
          </Link>
        )}
      </div>

      {/* WalletCard preview */}
      {design ? (
        <Link href={`/design/${design.id}`} className="block">
          <ScaledCardWrapper
            baseWidth={280}
            aspectRatio={1.282}
            minScale={0.6}
          >
            <WalletCard
              design={design}
              showQR
              showSecondaryFields={false}
              className="[&>div]:[box-shadow:none_!important]"
            />
          </ScaledCardWrapper>
        </Link>
      ) : (
        <div className="flex items-center justify-center h-[160px] rounded-xl bg-[var(--muted)] border border-dashed border-[var(--border-dark)]">
          <p className="text-xs text-[#A5A5A5]">{t("noCardYet")}</p>
        </div>
      )}

      {/* Stats column below card */}
      <div className="flex flex-col text-[11px] mt-4">
        <div className="flex justify-between mt-1.5">
          <span className="text-[var(--muted-foreground)]">{t("cardsIssued")}</span>
          <span className="text-[#555] font-semibold">
            {totalCustomers.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[var(--muted-foreground)]">{t("activePasses")}</span>
          <span className="text-[#555] font-semibold">
            {activeCards.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[var(--muted-foreground)]">{t("installRate")}</span>
          <span className="text-[#4A7C59] font-semibold">
            {installRate}%
          </span>
        </div>
      </div>
    </div>
  );
}
