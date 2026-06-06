"use client";

import { FilterDropdown } from "./filter-dropdown";
import { FilterPills } from "./filter-pills";
import { visibleOptionCount } from "./selection";
import type { FilterGroup, SearchBarLabels } from "./types";

const DEFAULT_PILL_THRESHOLD = 3;

/**
 * Dispatcher: renders a filter group as pills or a dropdown.
 * `display: "auto"` (default) collapses to a dropdown once the visible option
 * count exceeds `pillThreshold` (default 3 → 4+ options become a dropdown).
 */
export function FilterControl({
  group,
  labels,
}: {
  group: FilterGroup;
  labels?: SearchBarLabels;
}) {
  if (group.hidden) return null;

  const visible = visibleOptionCount(group);
  if (visible === 0) return null;

  const mode = group.display ?? "auto";
  const asDropdown =
    mode === "dropdown" ||
    (mode === "auto" && visible > (group.pillThreshold ?? DEFAULT_PILL_THRESHOLD));

  return asDropdown ? (
    <FilterDropdown group={group} labels={labels} />
  ) : (
    <FilterPills group={group} />
  );
}
