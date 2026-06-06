"use client";

import { MapPinIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { SingleSelectFilterGroup } from "@/components/reusables/search-bar";
import type { Location } from "@/types/location";

interface UseLocationFilterGroupArgs {
  locations: Location[];
  /** A location id, '__none__' for legacy/unassigned rows, or undefined for "all". */
  value: string | "__none__" | undefined;
  onChange: (value: string | "__none__" | undefined) => void;
  /** Surface the "Unassigned" option only when NULL-location rows actually exist. */
  hasLegacyTransactions?: boolean;
}

/**
 * Builds the location `FilterGroup` consumed by `<SearchBar filters={[...]}>`.
 * Replaces the old standalone `<LocationFilter>` component — the rendering now
 * goes through the shared, device-adaptive `FilterDropdown`. Bridges the
 * `undefined` ("all") sentinel to the SearchBar's `null` default.
 */
export function useLocationFilterGroup({
  locations,
  value,
  onChange,
  hasLegacyTransactions = false,
}: UseLocationFilterGroupArgs): SingleSelectFilterGroup {
  const t = useTranslations("activity.locationFilter");

  return {
    id: "location",
    label: t("label"),
    allLabel: t("allLocations"),
    icon: <MapPinIcon />,
    display: "dropdown",
    value: value ?? null,
    onChange: (v) => onChange(v === null ? undefined : (v as string | "__none__")),
    options: [
      ...locations.map((loc) => ({
        value: loc.id,
        label: loc.is_primary ? `${loc.name} · ${t("primary")}` : loc.name,
      })),
      ...(hasLegacyTransactions
        ? [{ value: "__none__", label: t("noLocation") }]
        : []),
    ],
  };
}
