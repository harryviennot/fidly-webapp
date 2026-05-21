"use client";

import { useTranslations } from "next-intl";
import { MapPinIcon, CaretDownIcon } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Location } from "@/types/location";

interface LocationFilterProps {
  locations: Location[];
  /** Selected value: a location id, '__none__' for legacy/parent-org rows,
   *  or undefined for "all locations". */
  value: string | "__none__" | undefined;
  onChange: (value: string | "__none__" | undefined) => void;
}

export function LocationFilter({
  locations,
  value,
  onChange,
}: LocationFilterProps) {
  const t = useTranslations("activity.locationFilter");

  const selected =
    value === undefined
      ? t("allLocations")
      : value === "__none__"
        ? t("noLocation")
        : (locations.find((l) => l.id === value)?.name ?? t("unknown"));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-[var(--card)] border border-[var(--border)] text-[12px] font-medium text-[#1A1A1A] hover:bg-[var(--muted)] transition-colors">
        <MapPinIcon className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        <span className="max-w-[160px] truncate">{selected}</span>
        <CaretDownIcon className="h-3 w-3 text-[var(--muted-foreground)]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        <DropdownMenuRadioGroup
          value={value ?? "__all__"}
          onValueChange={(v) => {
            if (v === "__all__") onChange(undefined);
            else if (v === "__none__") onChange("__none__");
            else onChange(v);
          }}
        >
          <DropdownMenuRadioItem value="__all__">
            {t("allLocations")}
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {locations.map((loc) => (
            <DropdownMenuRadioItem key={loc.id} value={loc.id}>
              <span className="flex items-center gap-1.5">
                {loc.name}
                {loc.is_primary && (
                  <span className="text-[9px] text-[var(--muted-foreground)] uppercase">
                    {t("primary")}
                  </span>
                )}
              </span>
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuRadioItem value="__none__">
            {t("noLocation")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onChange(undefined);
          }}
          className="text-[11px] text-[var(--muted-foreground)]"
        >
          {t("clear")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
