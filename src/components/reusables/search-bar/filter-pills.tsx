"use client";

import { FilterPill } from "@/components/reusables/filter-pill";
import { applySelection, isOptionSelected } from "./selection";
import type { FilterGroup } from "./types";

/** Renders a filter group as a wrapping row of pills (small option sets). */
export function FilterPills({ group }: { group: FilterGroup }) {
  const visible = group.options.filter((o) => !o.hidden);

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((option) => (
        <FilterPill
          key={option.value}
          label={option.label}
          count={option.count}
          isActive={isOptionSelected(group, option.value)}
          onClick={() => applySelection(group, option.value)}
          activeColor={option.color}
          activeBg={option.activeBg}
        />
      ))}
    </div>
  );
}
