"use client";

import { useTranslations } from "next-intl";
import { LocationBadge } from "./location-badge";
import type { Location } from "@/types/location";

interface LocationAssignmentChipsProps {
  /** Locations currently assigned to this membership. Sourced from
   *  `useLocationAssignmentsByMember` upstream so the team page only
   *  fans out once per render. */
  assigned: Location[];
}

/**
 * Read-only display for a scanner's location assignments. Shows the first
 * location as a chip plus a `+N` badge when more are assigned. Editing
 * happens in the `LocationDetailSheet → Members` section per location —
 * the team page intentionally doesn't double up that surface.
 */
export function LocationAssignmentChips({
  assigned,
}: LocationAssignmentChipsProps) {
  const t = useTranslations("team.locations");

  if (assigned.length === 0) {
    return (
      <span className="text-[11px] text-[var(--muted-foreground)] italic">
        {t("notAssigned")}
      </span>
    );
  }

  const first = assigned[0];
  const overflow = assigned.length - 1;

  return (
    <div className="flex items-center gap-1.5">
      <LocationBadge name={first.name} />
      {overflow > 0 && (
        <span
          className="inline-flex items-center rounded-full bg-[#F5F3EF] border border-[#EEEDEA] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#555]"
          title={assigned
            .slice(1)
            .map((l) => l.name)
            .join(", ")}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
