"use client";

import { useTranslations, useFormatter } from "next-intl";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import type { ProgramConversion } from "@/types";

/**
 * The ONE business-level event the main activity feed shows for a program-type
 * conversion (the per-enrollment balance_migrated rows stay in each customer's
 * timeline; the backend hides them from this feed). Rendered interleaved in the
 * date groups as a full-width structural row, visually distinct from customer
 * activity.
 */
export function ConversionMarker({ conversion }: { conversion: ProgramConversion }) {
  const t = useTranslations("activity.conversionMarker");
  const format = useFormatter();
  const when = conversion.completed_at ?? conversion.created_at;

  return (
    <div className="flex items-center gap-3 my-2 rounded-xl border border-dashed border-[#D8D5CE] bg-[var(--background-subtle)] px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0EDE7]">
        <ArrowsLeftRightIcon size={18} className="text-[var(--muted-foreground)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#1A1A1A]">
          {t(conversion.to_type === "points" ? "toPoints" : "toStamps")}
        </p>
        <p className="text-[12px] text-[#8A8A8A]">
          {t("summary", { count: conversion.converted_count })}
          {" · "}
          {format.dateTime(new Date(when), { day: "numeric", month: "short" })}
        </p>
      </div>
    </div>
  );
}
