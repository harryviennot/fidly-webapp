"use client";

import * as React from "react";
import {
  ArrowsDownUpIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { AdaptiveMenu, MenuRow, MenuSeparator } from "./adaptive-menu";
import type { SearchBarLabels, SortConfig } from "./types";

interface SortControlProps extends SortConfig {
  labels?: SearchBarLabels;
}

const SortTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & {
    label: string;
    isMobile: boolean;
    direction: "asc" | "desc";
  }
>(({ label, isMobile, direction, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    {...props}
    className={cn(
      "inline-flex items-center gap-1.5 px-3 rounded-full border text-[12px] font-medium transition-colors whitespace-nowrap",
      "bg-[var(--card)] border-[var(--border)] text-[#1A1A1A] hover:bg-[var(--muted)]",
      isMobile ? "h-9" : "h-8"
    )}
  >
    <ArrowsDownUpIcon className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
    <span className="max-w-[160px] truncate">{label}</span>
    {direction === "asc" ? (
      <CaretUpIcon className="h-3 w-3 shrink-0 opacity-70" />
    ) : (
      <CaretDownIcon className="h-3 w-3 shrink-0 opacity-70" />
    )}
  </button>
));
SortTrigger.displayName = "SortTrigger";

/**
 * Future-facing sort dropdown. Pick a field (radio) + a direction (asc/desc).
 * Device-adaptive like FilterDropdown. No screen wires this yet.
 */
export function SortControl({
  options,
  value,
  direction,
  onChange,
  label,
  labels,
}: SortControlProps) {
  const t = useTranslations("searchBar");
  const isMobile = useIsMobile();

  const current = options.find((o) => o.value === value);
  const triggerLabel = label
    ? `${label}${current ? `: ${current.label}` : ""}`
    : (current?.label ?? "");
  const ascLabel = labels?.ascending ?? t("ascending");
  const descLabel = labels?.descending ?? t("descending");

  return (
    <AdaptiveMenu
      label={label ?? t("sort")}
      align="end"
      trigger={
        <SortTrigger label={triggerLabel} isMobile={isMobile} direction={direction} />
      }
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <MenuRow
            key={option.value}
            selected={selected}
            onSelect={() => onChange(option.value, direction)}
          >
            <span className="flex-1 truncate">{option.label}</span>
            {selected && (
              <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            )}
          </MenuRow>
        );
      })}

      <MenuSeparator />

      <MenuRow
        selected={direction === "asc"}
        keepOpen
        onSelect={() => onChange(value, "asc")}
      >
        <CaretUpIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{ascLabel}</span>
        {direction === "asc" && (
          <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
        )}
      </MenuRow>
      <MenuRow
        selected={direction === "desc"}
        keepOpen
        onSelect={() => onChange(value, "desc")}
      >
        <CaretDownIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{descLabel}</span>
        {direction === "desc" && (
          <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
        )}
      </MenuRow>
    </AdaptiveMenu>
  );
}
