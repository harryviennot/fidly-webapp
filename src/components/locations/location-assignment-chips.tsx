"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MapPinIcon, PlusIcon, CheckIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LocationBadge } from "./location-badge";
import {
  useAssignLocationMember,
  useUnassignLocationMember,
} from "@/hooks/use-locations";
import type { Location } from "@/types/location";

interface LocationAssignmentChipsProps {
  businessId: string;
  membershipId: string;
  /** Locations currently assigned to this membership. Sourced from
   *  `useLocationAssignmentsByMember` upstream so the team page only
   *  fans out once per render. */
  assigned: Location[];
  /** Full list of active locations the business has. */
  allLocations: Location[];
  /** Whether the user can add/remove assignments. Owners and admins only. */
  canManage: boolean;
  /** Compact variant for mobile cards. */
  compact?: boolean;
}

export function LocationAssignmentChips({
  businessId,
  membershipId,
  assigned,
  allLocations,
  canManage,
  compact,
}: LocationAssignmentChipsProps) {
  const t = useTranslations("team.locations");
  const [open, setOpen] = useState(false);
  const assign = useAssignLocationMember(businessId);
  const unassign = useUnassignLocationMember(businessId);

  const assignedIds = useMemo(
    () => new Set(assigned.map((l) => l.id)),
    [assigned]
  );

  const handleToggle = (location: Location) => {
    if (assignedIds.has(location.id)) {
      unassign.mutate(
        { locationId: location.id, membershipId },
        {
          onSuccess: () =>
            toast.success(t("unassignedToast", { location: location.name })),
          onError: (err) =>
            toast.error(
              err instanceof Error ? err.message : t("assignmentFailed")
            ),
        }
      );
    } else {
      assign.mutate(
        { locationId: location.id, membershipId },
        {
          onSuccess: () =>
            toast.success(t("assignedToast", { location: location.name })),
          onError: (err) =>
            toast.error(
              err instanceof Error ? err.message : t("assignmentFailed")
            ),
        }
      );
    }
  };

  if (assigned.length === 0 && !canManage) {
    return (
      <span className="text-[11px] text-[var(--muted-foreground)]">
        {t("notAssignedNoManage")}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center flex-wrap gap-1",
        compact ? "gap-1" : "gap-1.5"
      )}
    >
      {assigned.map((loc) => (
        <LocationBadge
          key={loc.id}
          name={loc.name}
          variant={canManage ? "removable" : "default"}
          onRemove={
            canManage
              ? () =>
                  unassign.mutate(
                    { locationId: loc.id, membershipId },
                    {
                      onSuccess: () =>
                        toast.success(
                          t("unassignedToast", { location: loc.name })
                        ),
                      onError: (err) =>
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : t("assignmentFailed")
                        ),
                    }
                  )
              : undefined
          }
        />
      ))}
      {assigned.length === 0 && (
        <span className="text-[11px] text-[var(--muted-foreground)] italic">
          {t("notAssigned")}
        </span>
      )}
      {canManage && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--muted-foreground)] hover:text-[#1A1A1A] hover:bg-[var(--muted)] transition-colors"
              aria-label={t("assign")}
            >
              <PlusIcon className="h-3 w-3" />
              {assigned.length === 0 ? t("assign") : null}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1">
            <p className="px-2.5 py-1.5 text-[10.5px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              {t("popoverTitle")}
            </p>
            {allLocations.map((loc) => {
              const isOn = assignedIds.has(loc.id);
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => handleToggle(loc)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[var(--muted)] transition-colors text-left"
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded-sm border flex items-center justify-center shrink-0",
                      isOn
                        ? "bg-[var(--accent)] border-[var(--accent)]"
                        : "bg-white border-[var(--border)]"
                    )}
                  >
                    {isOn && (
                      <CheckIcon className="h-3 w-3 text-white" weight="bold" />
                    )}
                  </span>
                  <MapPinIcon className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0" />
                  <span className="text-[12px] text-[#1A1A1A] truncate flex-1">
                    {loc.name}
                  </span>
                  {loc.is_primary && (
                    <span className="text-[9px] text-[var(--muted-foreground)] uppercase">
                      {t("primary")}
                    </span>
                  )}
                </button>
              );
            })}
            {allLocations.length === 0 && (
              <p className="px-2.5 py-3 text-[11px] text-[var(--muted-foreground)] text-center">
                {t("noLocations")}
              </p>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
