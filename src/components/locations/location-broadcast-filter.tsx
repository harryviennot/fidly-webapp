"use client";

import { useTranslations } from "next-intl";
import { InfoIcon, MapPinIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  BroadcastTargetFilter,
  EnrolledLocationFilter,
  ActiveLocationFilter,
} from "@/types/notification";
import type { Location } from "@/types/location";

type UpdateFilterFn = <K extends keyof BroadcastTargetFilter>(
  key: K,
  value: BroadcastTargetFilter[K]
) => void;

interface Props {
  locations: Location[];
  targetFilter: BroadcastTargetFilter;
  updateFilter: UpdateFilterFn;
  disabled?: boolean;
}

const DEFAULT_DAYS = 14;

export function LocationsBroadcastFilter({
  locations,
  targetFilter,
  updateFilter,
  disabled,
}: Props) {
  const t = useTranslations(
    "notifications.broadcasts.wizard.audience.locations"
  );

  const enrolled = targetFilter.enrolled_at_location_ids;
  const active = targetFilter.active_at_location_ids;

  const toggleEnrolled = (locationId: string) => {
    const current = enrolled?.ids ?? [];
    const nextIds = current.includes(locationId)
      ? current.filter((id) => id !== locationId)
      : [...current, locationId];

    if (nextIds.length === 0 && !enrolled?.include_no_location) {
      updateFilter("enrolled_at_location_ids", undefined);
      return;
    }
    const next: EnrolledLocationFilter = {
      ids: nextIds,
      ...(enrolled?.include_no_location && {
        include_no_location: enrolled.include_no_location,
      }),
    };
    updateFilter("enrolled_at_location_ids", next);
  };

  const toggleIncludeNoLocation = (on: boolean) => {
    const ids = enrolled?.ids ?? [];
    if (!on && ids.length === 0) {
      updateFilter("enrolled_at_location_ids", undefined);
      return;
    }
    updateFilter("enrolled_at_location_ids", {
      ids,
      ...(on && { include_no_location: true }),
    });
  };

  const toggleActive = (locationId: string) => {
    const current = active?.ids ?? [];
    const nextIds = current.includes(locationId)
      ? current.filter((id) => id !== locationId)
      : [...current, locationId];

    if (nextIds.length === 0) {
      updateFilter("active_at_location_ids", undefined);
      return;
    }
    const next: ActiveLocationFilter = {
      ids: nextIds,
      days: active?.days ?? DEFAULT_DAYS,
    };
    updateFilter("active_at_location_ids", next);
  };

  const setActiveDays = (days: number | undefined) => {
    if (!active || !active.ids.length) return;
    if (days == null || days < 1) return;
    updateFilter("active_at_location_ids", {
      ids: active.ids,
      days: Math.min(30, Math.max(1, days)),
    });
  };

  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-[var(--paper)] p-3 space-y-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#555] uppercase tracking-wide">
        <MapPinIcon className="h-3.5 w-3.5" weight="fill" />
        {t("groupLabel")}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t("groupLabel")}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[#A0A0A0] hover:text-[#555]"
            >
              <InfoIcon className="h-3.5 w-3.5" weight="regular" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-[260px] text-[11px] leading-[1.45]"
          >
            {t("groupHelp")}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* A. Enrolled-at */}
      <div className="space-y-2">
        <Label className="text-[11px] text-[#555]">
          {t("enrolledTitle")}
        </Label>
        <p className="text-[11px] text-[#8A8A8A] leading-[1.4]">
          {t("enrolledHelp")}
        </p>
        <ChipGrid
          locations={locations}
          selected={new Set(enrolled?.ids ?? [])}
          onToggle={toggleEnrolled}
          disabled={disabled}
        />
        <label
          className={cn(
            "flex items-center gap-2 cursor-pointer pt-1",
            disabled && "opacity-50"
          )}
        >
          <Switch
            checked={!!enrolled?.include_no_location}
            onCheckedChange={toggleIncludeNoLocation}
            disabled={disabled}
          />
          <span className="text-[11.5px] text-[#555]">
            {t("includeDirect")}
          </span>
        </label>
      </div>

      <div className="h-px bg-[var(--border-light)]" />

      {/* B. Active-at */}
      <div className="space-y-2">
        <Label className="text-[11px] text-[#555]">
          {t("activeTitle")}
        </Label>
        <p className="text-[11px] text-[#8A8A8A] leading-[1.4]">
          {t("activeHelp")}
        </p>
        <ChipGrid
          locations={locations}
          selected={new Set(active?.ids ?? [])}
          onToggle={toggleActive}
          disabled={disabled}
        />
        {active && active.ids.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              type="number"
              min={1}
              max={30}
              value={active.days}
              disabled={disabled}
              onChange={(e) => {
                const raw = e.target.value;
                setActiveDays(raw === "" ? undefined : parseInt(raw, 10));
              }}
              className="w-[80px] h-8 text-sm"
            />
            <span className="text-[11.5px] text-[#8A8A8A]">
              {t("daysSuffix")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChipGrid({
  locations,
  selected,
  onToggle,
  disabled,
}: {
  locations: Location[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {locations.map((loc) => {
        const isOn = selected.has(loc.id);
        return (
          <button
            key={loc.id}
            type="button"
            onClick={() => onToggle(loc.id)}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium border transition-colors",
              isOn
                ? "bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)]"
                : "bg-white border-[var(--border-light)] text-[#555] hover:border-[var(--border)]",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {loc.name}
            {loc.is_primary && (
              <span className="text-[9px] opacity-60 uppercase">·</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
