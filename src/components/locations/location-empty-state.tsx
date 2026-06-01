"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { MapPinIcon, PlusIcon, CrownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface LocationEmptyStateProps {
  canAddMore: boolean;
  onAdd: () => void;
}

export function LocationEmptyState({
  canAddMore,
  onAdd,
}: LocationEmptyStateProps) {
  const t = useTranslations("loyaltyProgram.locations.empty");

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-[var(--border)] rounded-xl text-center">
      <div className="w-12 h-12 rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
        <MapPinIcon className="w-6 h-6 text-[var(--muted-foreground)]" />
      </div>
      <h3 className="text-[15px] font-semibold text-[#1A1A1A] mb-1">
        {t("title")}
      </h3>
      <p className="text-[13px] text-[var(--muted-foreground)] max-w-md mb-5">
        {t("description")}
      </p>
      {canAddMore ? (
        <Button onClick={onAdd} variant="gradient" className="rounded-full">
          <PlusIcon className="h-4 w-4" />
          {t("cta")}
        </Button>
      ) : (
        <Link
          href="/billing?from=locations.empty"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#1A1A1A]/90 transition-colors"
        >
          <CrownIcon className="h-3.5 w-3.5 text-amber-400" weight="fill" />
          {t("upgradeCta")}
        </Link>
      )}
    </div>
  );
}
