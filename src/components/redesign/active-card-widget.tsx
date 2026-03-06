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

  const stats = [
    { label: t("cardsIssued"), value: totalCustomers.toLocaleString(), color: "#555" },
    { label: t("activePasses"), value: activeCards.toLocaleString(), color: "#555" },
    { label: t("installRate"), value: `${installRate}%`, color: "var(--accent)" },
  ];

  /* Compact row layout for lg+ sidebar column */
  const statsCompact = (
    <div className="flex flex-col text-[11px]">
      {stats.map((s) => (
        <div key={s.label} className="flex justify-between mt-1.5">
          <span className="text-[var(--muted-foreground)]">{s.label}</span>
          <span className="font-semibold" style={{ color: s.color }}>{s.value}</span>
        </div>
      ))}
    </div>
  );

  /* Stacked blocks for mobile/tablet horizontal layout */
  const statsExpanded = (
    <div className="flex flex-col gap-2.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center justify-between rounded-lg bg-[var(--background)] px-3 py-2"
        >
          <span className="text-[12px] text-[var(--muted-foreground)]">{s.label}</span>
          <span className="text-[16px] font-semibold tracking-tight" style={{ color: s.color }}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );

  const cardPreview = design ? (
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
  );

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

      {/* Horizontal layout when stacked (below lg), vertical when in sidebar column (lg+) */}
      <div className="flex flex-row gap-4 lg:flex-col lg:gap-0">
        {/* Card preview — 1/3 width when horizontal, full width when vertical */}
        <div className="w-1/2 md:w-1/3 shrink-0 lg:w-full">
          {cardPreview}
        </div>

        {/* Stats — expanded blocks when horizontal, compact rows when in sidebar */}
        <div className="flex-1 flex flex-col justify-center lg:mt-4">
          <div className="hidden lg:block">{statsCompact}</div>
          <div className="block lg:hidden">{statsExpanded}</div>
        </div>
      </div>
    </div>
  );
}
