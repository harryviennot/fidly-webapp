"use client";

import { SearchInput } from "@/components/reusables/search-input";
import { cn } from "@/lib/utils";
import { FilterControl } from "./filter-control";
import { SortControl } from "./sort-control";
import type { SearchBarProps } from "./types";

/**
 * Config-driven toolbar: search input + filter groups (pills/dropdown, auto) +
 * an optional sort control + a right-aligned actions slot + an optional second
 * row. Owns the flat card shell and the responsive reflow (search goes full-width
 * on phones; everything else wraps below).
 *
 * @see ./types for the full prop API.
 */
export function SearchBar({
  search,
  filters,
  sort,
  actions,
  secondaryRow,
  bare,
  className,
  labels,
}: SearchBarProps) {
  const content = (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        {search && (
          <div
            className={cn(
              "basis-full sm:basis-auto sm:flex-1 min-w-0 sm:min-w-[180px]",
              search.className
            )}
          >
            <SearchInput
              value={search.value}
              onChange={search.onChange}
              placeholder={search.placeholder}
              className="w-full min-w-0"
            />
          </div>
        )}

        {filters?.map((group) => (
          <FilterControl key={group.id} group={group} labels={labels} />
        ))}

        {sort && <SortControl {...sort} labels={labels} />}

        {actions && (
          <div className="w-full sm:w-auto sm:ml-auto">{actions}</div>
        )}
      </div>

      {secondaryRow && <div className="mt-2.5">{secondaryRow}</div>}
    </>
  );

  if (bare) return <div className={className}>{content}</div>;

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5",
        className
      )}
    >
      {content}
    </div>
  );
}
