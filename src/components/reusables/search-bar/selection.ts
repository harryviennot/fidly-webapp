import type { FilterGroup, FilterOption } from "./types";

/** Is this option currently selected? (single: equality / null=all; multi: membership) */
export function isOptionSelected(group: FilterGroup, value: string): boolean {
  if (group.multiple) return group.value.includes(value);
  if (group.value === null) {
    return group.allValue !== undefined && value === group.allValue;
  }
  return group.value === value;
}

/** Apply a click on an option: set for single, toggle for multi. Selecting the
 *  `allValue` option (single) resets to `null`. */
export function applySelection(group: FilterGroup, value: string): void {
  if (group.multiple) {
    const next = group.value.includes(value)
      ? group.value.filter((v) => v !== value)
      : [...group.value, value];
    group.onChange(next);
    return;
  }
  if (group.allValue !== undefined && value === group.allValue) {
    group.onChange(null);
    return;
  }
  group.onChange(value);
}

/** Reset the group to its default ("all" / none). */
export function clearSelection(group: FilterGroup): void {
  if (group.multiple) group.onChange([]);
  else group.onChange(null);
}

/** Is the group in its default (no active filter) state? */
export function isGroupDefault(group: FilterGroup): boolean {
  if (group.multiple) return group.value.length === 0;
  return group.value === null;
}

/** The selected option (single-select only) — for the trigger color/icon. */
export function activeOption(group: FilterGroup): FilterOption | undefined {
  if (group.multiple || group.value === null) return undefined;
  return group.options.find((o) => o.value === group.value);
}

/** Count of options that will actually render. */
export function visibleOptionCount(group: FilterGroup): number {
  return group.options.reduce((n, o) => (o.hidden ? n : n + 1), 0);
}
