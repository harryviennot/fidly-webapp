"use client";

import { useTranslations } from "next-intl";
import { PlusIcon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";

interface LocationAddTileProps {
  onClick: () => void;
}

/** "+ Add another location" affordance — renders as a card-shaped slot in
 *  the locations grid so the layout stays balanced when the business has
 *  exactly one location. Dashed border + accent foreground signals "empty
 *  slot waiting for content" without the visual weight of a full empty-state
 *  card. */
export function LocationAddTile({ onClick }: LocationAddTileProps) {
  const t = useTranslations("loyaltyProgram.locations.card");
  return (
    <Card
      hover
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="!border-dashed !border-2 !shadow-none bg-transparent hover:bg-[color-mix(in_srgb,var(--accent)_4%,transparent)] cursor-pointer min-h-[180px] flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
        <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] flex items-center justify-center">
          <PlusIcon
            className="h-5 w-5 text-[var(--accent)]"
            weight="bold"
          />
        </div>
        <span className="text-[13px] font-semibold text-[var(--accent)]">
          {t("addAnother")}
        </span>
      </div>
    </Card>
  );
}
