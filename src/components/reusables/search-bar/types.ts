import type { ReactNode } from "react";

/**
 * A single selectable option inside a filter group.
 * `value` is the i18n-agnostic key kept in state; `label` is already translated
 * by the caller.
 */
export interface FilterOption {
  value: string;
  label: string;
  /** Optional count badge (segments, roles…). */
  count?: number;
  /** Color-coded filters (e.g. activity types). Drives the pill active color
   *  AND the dot shown in the dropdown. */
  color?: string;
  /** Pill active background (pairs with `color`). */
  activeBg?: string;
  /** Optional leading icon, rendered in the dropdown item (ignored for pills). */
  icon?: ReactNode;
  /** Skip this option entirely (e.g. a zero-count segment). */
  hidden?: boolean;
}

export type FilterDisplayMode = "pills" | "dropdown" | "auto";

interface FilterGroupBase {
  /** Stable id (React keys / debugging). */
  id: string;
  /** Group label — dropdown trigger prefix in default state + a11y / sheet title. */
  label: string;
  options: FilterOption[];
  /** "auto" (default) renders pills while the visible option count is
   *  `<= pillThreshold`, otherwise a dropdown. */
  display?: FilterDisplayMode;
  /** Auto threshold — collapse to a dropdown past this many visible options.
   *  Defaults to 3 (i.e. 4+ options become a dropdown). */
  pillThreshold?: number;
  /** Leading icon for the dropdown trigger (e.g. a MapPin). */
  icon?: ReactNode;
  /** Hide the whole group (e.g. the location filter when single-location). */
  hidden?: boolean;
}

export interface SingleSelectFilterGroup extends FilterGroupBase {
  multiple?: false;
  /** `null` = the default / "all" state. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** When one of `options` already represents the "all"/reset state, set its
   *  value here so selecting it maps back to `null`. Omit when "all" has no
   *  dedicated option (a synthetic "All" row is then injected at the top of the
   *  dropdown). */
  allValue?: string;
  /** Label for the default/"all" state — used for the synthetic "All" row and
   *  as the trigger label when nothing is selected. Falls back to `label`. */
  allLabel?: string;
}

export interface MultiSelectFilterGroup extends FilterGroupBase {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}

export type FilterGroup = SingleSelectFilterGroup | MultiSelectFilterGroup;

export interface SearchConfig {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Extra classes on the search wrapper, e.g. `max-w-md`. */
  className?: string;
}

export type SortDirection = "asc" | "desc";

export interface SortOption {
  value: string;
  label: string;
}

export interface SortConfig {
  options: SortOption[];
  value: string;
  direction: SortDirection;
  onChange: (value: string, direction: SortDirection) => void;
  /** Trigger prefix, e.g. "Sort". */
  label?: string;
}

/** Overrides for the primitives' built-in strings (otherwise pulled from the
 *  shared `searchBar` i18n namespace). */
export interface SearchBarLabels {
  all?: string;
  clear?: string;
  ascending?: string;
  descending?: string;
}

export interface SearchBarProps {
  search?: SearchConfig;
  filters?: FilterGroup[];
  sort?: SortConfig;
  /** Right-aligned slot (e.g. a ViewToggle); gets `ml-auto` from `sm:` up. */
  actions?: ReactNode;
  /** Optional second row inside the same card (e.g. the businesses status row). */
  secondaryRow?: ReactNode;
  /** Render without the card shell so the caller can wrap it (e.g. sticky). */
  bare?: boolean;
  className?: string;
  labels?: SearchBarLabels;
}
