"use client";

import * as React from "react";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { AdaptiveMenu, MenuRow, MenuSeparator } from "./adaptive-menu";
import {
  activeOption,
  applySelection,
  clearSelection,
  isGroupDefault,
  isOptionSelected,
} from "./selection";
import type { FilterGroup, SearchBarLabels } from "./types";

interface FilterDropdownProps {
  group: FilterGroup;
  labels?: SearchBarLabels;
}

/** The current trigger label: selected option (single) or the default/all label. */
function triggerLabel(group: FilterGroup): string {
  if (group.multiple) return group.label;
  const selected = activeOption(group);
  if (selected) return selected.label;
  return group.allLabel ?? group.label;
}

const FilterTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & {
    group: FilterGroup;
    active: boolean;
    isMobile: boolean;
  }
>(({ group, active, isMobile, ...props }, ref) => {
  const selected = activeOption(group);
  const color = selected?.color ?? "var(--accent)";
  const bg = selected?.activeBg ?? "var(--accent-light)";
  const multiCount = group.multiple ? group.value.length : 0;

  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 rounded-full border text-[12px] font-medium transition-colors whitespace-nowrap",
        isMobile ? "h-9" : "h-8",
        !active &&
          "bg-[var(--card)] border-[var(--border)] text-[#1A1A1A] hover:bg-[var(--muted)]"
      )}
      style={
        active
          ? { border: `1.5px solid ${color}`, background: bg, color, fontWeight: 600 }
          : undefined
      }
    >
      {group.icon && (
        <span className="shrink-0 inline-flex [&>svg]:h-3.5 [&>svg]:w-3.5">
          {group.icon}
        </span>
      )}
      <span className="max-w-[160px] truncate">{triggerLabel(group)}</span>
      {group.multiple && multiCount > 0 && (
        <span className="text-[10px] tabular-nums">({multiCount})</span>
      )}
      <CaretDownIcon className="h-3 w-3 shrink-0 opacity-70" />
    </button>
  );
});
FilterTrigger.displayName = "FilterTrigger";

export function FilterDropdown({ group, labels }: FilterDropdownProps) {
  const t = useTranslations("searchBar");
  const isMobile = useIsMobile();

  const visible = group.options.filter((o) => !o.hidden);
  const active = !isGroupDefault(group);
  const allLabel =
    (!group.multiple ? group.allLabel : undefined) ?? labels?.all ?? t("all");
  const clearLabel = labels?.clear ?? t("clear");
  // Inject a synthetic "All" row only when no option already represents the
  // default state (single-select groups without an explicit `allValue`).
  const showSyntheticAll = !group.multiple && group.allValue === undefined;

  return (
    <AdaptiveMenu
      label={group.label}
      trigger={<FilterTrigger group={group} active={active} isMobile={isMobile} />}
    >
      {showSyntheticAll && (
        <>
          <MenuRow
            selected={isGroupDefault(group)}
            onSelect={() => clearSelection(group)}
          >
            <span className="flex-1 truncate">{allLabel}</span>
            {isGroupDefault(group) && (
              <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            )}
          </MenuRow>
          <MenuSeparator />
        </>
      )}

      {visible.map((option) => {
        const selected = isOptionSelected(group, option.value);
        return (
          <MenuRow
            key={option.value}
            selected={selected}
            keepOpen={group.multiple}
            onSelect={() => applySelection(group, option.value)}
          >
            {option.color ? (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: option.color }}
              />
            ) : option.icon ? (
              <span className="shrink-0 inline-flex [&>svg]:h-4 [&>svg]:w-4">
                {option.icon}
              </span>
            ) : null}
            <span className="flex-1 truncate">{option.label}</span>
            {option.count !== undefined && (
              <span className="shrink-0 text-[11px] tabular-nums text-[var(--muted-foreground)]">
                {option.count}
              </span>
            )}
            {selected && (
              <CheckIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            )}
          </MenuRow>
        );
      })}

      {active && (
        <>
          <MenuSeparator />
          <MenuRow muted onSelect={() => clearSelection(group)}>
            {clearLabel}
          </MenuRow>
        </>
      )}
    </AdaptiveMenu>
  );
}
