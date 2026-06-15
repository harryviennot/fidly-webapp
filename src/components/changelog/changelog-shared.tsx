"use client";

import { useState } from "react";
import { Sparkle, ArrowUp, Bug, CaretDown } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { areaDotHex } from "@/lib/changelog-areas";
import {
  resolveLocale,
  type ChangelogArea,
  type ChangelogCategory,
  type ChangelogItem,
} from "@/api/changelog";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

export const CATEGORY_ICON: Record<ChangelogCategory, typeof Sparkle> = {
  feature: Sparkle,
  improvement: ArrowUp,
  fix: Bug,
};

/** Strip the most common Markdown markers for a short body preview. */
export function plainExcerpt(md: string): string {
  return md
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Public showcase changelog URL for the current locale. */
export function showcaseChangelogUrl(locale: string): string {
  const base = process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";
  return `${base}${locale === "en" ? "/en" : ""}/changelog`;
}

/** Date in the viewer's locale, e.g. "June 11, 2026" / "11 juin 2026". */
export function formatReleaseDate(iso: string | null, locale: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(
      locale === "fr" ? "fr-FR" : "en-US",
      { month: "long", day: "numeric", year: "numeric" }
    );
  } catch {
    return "";
  }
}

/** A single changelog line: area pill + title (+ optional body) + team flag. */
export function ChangelogItemRow({
  item,
  area,
  locale,
  forTeamLabel,
}: {
  item: ChangelogItem;
  area: ChangelogArea | undefined;
  locale: string;
  forTeamLabel: string;
}) {
  const title = resolveLocale(item.title_fr, item.title_en, locale);
  const body = resolveLocale(item.body_fr, item.body_en, locale);
  const teamOnly =
    (item.affects ?? []).includes("scanner") &&
    !(item.affects ?? []).includes("owner");

  return (
    <li className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-2.5">
      {area && (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: areaDotHex(area.color) }}
          />
          {locale === "en" ? area.label_en : area.label_fr}
        </span>
      )}
      <div className="min-w-0">
        <span className="text-[13px] font-medium text-[var(--foreground)]">
          {title}
        </span>
        {teamOnly && (
          <span className="ml-2 text-[11px] font-medium text-[var(--accent)]">
            {forTeamLabel}
          </span>
        )}
        {body && (
          <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
            {body}
          </p>
        )}
      </div>
    </li>
  );
}

/** Improvements / Fixes collapse into an accordion, collapsed by default
 *  (Linear-style). Reuses the shared Collapsible + `.collapsible-content`
 *  height animation, matching CollapsibleSection. */
export function CategoryAccordion({
  cat,
  label,
  items,
  areaBySlug,
  locale,
  forTeamLabel,
}: {
  cat: ChangelogCategory;
  label: string;
  items: ChangelogItem[];
  areaBySlug: Map<string, ChangelogArea>;
  locale: string;
  forTeamLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const Icon = CATEGORY_ICON[cat];

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="border-t border-[var(--border)] pt-3"
    >
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center gap-2 text-left">
          <Icon
            className="h-3.5 w-3.5 text-[var(--muted-foreground)]"
            weight="bold"
          />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            {label}
          </span>
          <span className="text-[11px] font-semibold text-[var(--muted-foreground)]/60">
            {items.length}
          </span>
          <CaretDown
            className={cn(
              "ml-auto h-3.5 w-3.5 text-[var(--muted-foreground)] transition-transform duration-200",
              open && "rotate-180"
            )}
            weight="bold"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="collapsible-content">
        <ul className="mt-1 divide-y divide-[var(--border)]/60">
          {items.map((item) => (
            <ChangelogItemRow
              key={item.id}
              item={item}
              area={item.area ? areaBySlug.get(item.area) : undefined}
              locale={locale}
              forTeamLabel={forTeamLabel}
            />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
