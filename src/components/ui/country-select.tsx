"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CaretDown } from "@phosphor-icons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SearchInput } from "@/components/reusables/search-input";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  getCountryList,
  getCountryByCode,
  isPriorityCountry,
  type CountryEntry,
} from "@/lib/countries";

interface CountrySelectProps {
  /** Selected ISO-2 code, or undefined when nothing is chosen yet. */
  readonly value?: string;
  readonly onChange: (code: string) => void;
  readonly placeholder?: string;
  readonly id?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  /** Accessible label / mobile sheet title (e.g. "Country"). */
  readonly label?: string;
}

/** Lowercase + strip accents so "etats" matches "États-Unis". */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Searchable country picker for the business location. Shows a flag + localized
 * name; priority markets float to the top with a divider. Device-adaptive like
 * the icon picker: a collision-aware popover on desktop, a bottom sheet on
 * phones. Country-only (no dial codes) — this is a location field.
 */
export function CountrySelect({
  value,
  onChange,
  placeholder,
  id,
  disabled,
  className,
  label,
}: CountrySelectProps) {
  const locale = useLocale();
  const t = useTranslations("countrySelect");
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const countries = useMemo(() => getCountryList(locale), [locale]);
  const selected = useMemo(
    () => getCountryByCode(value, locale),
    [value, locale]
  );

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return countries;
    return countries.filter(
      (c) => normalize(c.name).includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countries, query]);

  const handleSelect = (entry: CountryEntry) => {
    onChange(entry.code);
    setOpen(false);
    setQuery("");
  };

  const trigger = (
    <button
      id={id}
      type="button"
      disabled={disabled}
      aria-label={label}
      aria-expanded={open}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-lg border border-[#DEDBD5] bg-background px-3 h-10 text-sm transition-colors",
        "hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {selected ? (
        <>
          <span className="text-lg leading-none">{selected.flag}</span>
          <span className="flex-1 min-w-0 text-left truncate text-[#333]">
            {selected.name}
          </span>
        </>
      ) : (
        <span className="flex-1 text-left truncate text-[#B0B0B0]">
          {placeholder ?? t("placeholder")}
        </span>
      )}
      <CaretDown className="w-4 h-4 text-[#999] shrink-0" />
    </button>
  );

  const list = (
    <div className="max-h-[280px] overflow-y-auto overscroll-contain">
      {filtered.map((entry, i) => {
        const showDivider =
          !query &&
          i > 0 &&
          isPriorityCountry(filtered[i - 1].code) &&
          !isPriorityCountry(entry.code);
        return (
          <div key={entry.code}>
            {showDivider && <div className="my-1 border-t border-[#EEE]" />}
            <button
              type="button"
              onClick={() => handleSelect(entry)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md transition-colors",
                "hover:bg-muted/50",
                entry.code === value && "bg-[var(--accent)]/5 font-medium"
              )}
            >
              <span className="text-lg leading-none">{entry.flag}</span>
              <span className="flex-1 min-w-0 truncate text-[#333]">
                {entry.name}
              </span>
            </button>
          </div>
        );
      })}
      {filtered.length === 0 && (
        <div className="px-3 py-6 text-center text-sm text-[#999]">
          {t("noResults")}
        </div>
      )}
    </div>
  );

  const search = (
    <div className="p-2">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={t("search")}
        className="w-full"
      />
    </div>
  );

  if (isMobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
      >
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t border-[var(--border)] bg-[var(--card)] p-0 gap-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="px-4 pt-4 pb-1">
            <SheetTitle className="text-[15px] font-bold text-left">
              {label ?? t("title")}
            </SheetTitle>
          </SheetHeader>
          <div className="px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {search}
            {list}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0" align="start">
        {search}
        {list}
      </PopoverContent>
    </Popover>
  );
}
