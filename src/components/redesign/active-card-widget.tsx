"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WalletCard } from "@/components/card";
import { ScaledCardWrapper } from "@/components/design/ScaledCardWrapper";
import type { CardDesign } from "@/types";

interface ActiveCardWidgetProps {
  design: CardDesign | null | undefined;
  totalCustomers?: number;
  activeCards?: number;
  className?: string;
  delay?: number;
  isOwner?: boolean;
  /** Render the cards-issued / active-passes / install-rate stats. The Dashboard
   *  shows them; the Program control center hides them (install rate lives in the
   *  Program Health card there) and surfaces template actions instead. */
  showStats?: boolean;
  /** When set (and isOwner), a "Switch template" link appears in the header.
   *  Used on the Program page to make this widget program-specific. */
  switchTemplateHref?: string;
}

export function ActiveCardWidget({
  design,
  totalCustomers = 0,
  activeCards = 0,
  className,
  delay = 0,
  isOwner = true,
  showStats = true,
  switchTemplateHref,
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

  const cardContent = design ? (
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
  ) : null;

  const cardPreview = design ? (
    isOwner ? (
      <Link href={`/design/${design.id}`} className="block">
        {cardContent}
      </Link>
    ) : (
      <div>{cardContent}</div>
    )
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
      {showStats ? (
        <>
          {/* Dashboard: header (title + edit link) above preview + stats */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-body text-[15px] font-semibold text-[#1A1A1A]">
              {t("activeCard")}
            </h3>
            {design && isOwner && (
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
            <div className="w-1/2 md:w-1/3 shrink-0 lg:w-full">
              {cardPreview}
            </div>
            <div className="flex-1 flex flex-col justify-center lg:mt-4">
              <div className="hidden lg:block">{statsCompact}</div>
              <div className="block lg:hidden">{statsExpanded}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Program control center: preview first, title + actions below. */}
          {cardPreview}

          <div className="mt-3.5">
            <h3 className="font-body text-[13px] font-semibold text-[#1A1A1A] mb-2.5">
              {t("activeCard")}
            </h3>
            {design && isOwner && (
              <div className="flex flex-col gap-2">
                <Button size="sm" className="w-full" asChild>
                  <Link href={`/design/${design.id}`}>{t("edit")}</Link>
                </Button>
                {switchTemplateHref && (
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={switchTemplateHref}>{t("switchTemplate")}</Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
