"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocale } from "next-intl";
import { CaretDown } from "@phosphor-icons/react";
import type { CountryCode } from "libphonenumber-js";
import { getCountryCallingCode } from "libphonenumber-js";
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
  detectDefaultCountry,
  formatToE164,
  formatAsYouType,
  getExamplePhoneNumber,
  type CountryEntry,
} from "@/lib/phone-utils";

interface PhoneInputProps {
  value: string;
  onChange: (e164Value: string) => void;
  defaultCountry?: CountryCode;
  error?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

/** Priority markets shown at the top of the list, before the divider. */
const PRIORITY_SET = new Set<string>([
  "FR", "BE", "CH", "CA", "US", "GB", "DE", "ES", "IT", "PT", "NL",
  "MA", "TN", "DZ", "SN", "CI", "CM",
]);

export function PhoneInput({
  value,
  onChange,
  defaultCountry,
  error,
  required,
  placeholder,
  className,
  id,
}: PhoneInputProps) {
  const locale = useLocale();
  const isMobile = useIsMobile();
  const [country, setCountry] = useState<CountryCode>(
    defaultCountry || detectDefaultCountry(locale)
  );
  const countries = useMemo(() => getCountryList(locale), [locale]);

  const [nationalInput, setNationalInput] = useState(() => {
    if (!value) return "";
    const dialCode = `+${getCountryCallingCode(country)}`;
    if (value.startsWith(dialCode)) {
      return formatAsYouType(value.slice(dialCode.length), country);
    }
    return value;
  });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Desktop dropdown is rendered INLINE inside the dialog (not portaled), so it
  // lives within the dialog's scroll context — a body-portaled popover gets its
  // wheel/touch events swallowed by the dialog's scroll lock and won't scroll.
  // Close it on an outside click. Mobile uses a Sheet (its own scroll context).
  useEffect(() => {
    if (!open || isMobile) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, isMobile]);

  const filteredCountries = useMemo(() => {
    if (!search) return countries;
    const q = search.toLowerCase();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countries, search]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setNationalInput(formatAsYouType(raw, country));
      const e164 = formatToE164(raw, country);
      onChange(e164 || raw);
    },
    [country, onChange]
  );

  const handleCountrySelect = useCallback(
    (entry: CountryEntry) => {
      setCountry(entry.code);
      setOpen(false);
      setSearch("");
      if (nationalInput) {
        const e164 = formatToE164(nationalInput, entry.code);
        onChange(e164 || nationalInput);
        setNationalInput(formatAsYouType(nationalInput, entry.code));
      }
      inputRef.current?.focus();
    },
    [nationalInput, onChange]
  );

  const selectedCountry = countries.find((c) => c.code === country);
  const exampleNumber = getExamplePhoneNumber(country);

  const searchPlaceholder =
    locale === "fr"
      ? "Rechercher un pays..."
      : locale === "es"
        ? "Buscar un país..."
        : "Search countries...";
  const noResults =
    locale === "fr"
      ? "Aucun pays trouvé"
      : locale === "es"
        ? "No se encontró ningún país"
        : "No countries found";

  const triggerButton = (onClick?: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="
        flex items-center gap-1.5 px-3 shrink-0
        border-r border-[var(--border)]
        hover:bg-black/5 transition-colors duration-150
        text-sm text-[var(--foreground)] cursor-pointer
      "
      aria-label="Select country"
      aria-expanded={open}
    >
      <span className="text-lg leading-none">{selectedCountry?.flag}</span>
      <span className="text-[var(--muted-foreground)]">
        {selectedCountry?.dialCode}
      </span>
      <CaretDown
        className={cn(
          "w-3 h-3 text-[var(--muted-foreground)] transition-transform duration-150",
          open && "rotate-180"
        )}
      />
    </button>
  );

  const searchBox = (
    <div className="p-2">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={searchPlaceholder}
        className="w-full"
      />
    </div>
  );

  const list = (
    <div className="max-h-[240px] overflow-y-auto overscroll-contain">
      {filteredCountries.map((entry, i) => {
        const showDivider =
          !search &&
          i > 0 &&
          PRIORITY_SET.has(filteredCountries[i - 1].code) &&
          !PRIORITY_SET.has(entry.code);
        return (
          <div key={entry.code}>
            {showDivider && (
              <div className="my-1 border-t border-[var(--border)]" />
            )}
            <button
              type="button"
              onClick={() => handleCountrySelect(entry)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-md transition-colors hover:bg-muted/50",
                entry.code === country && "bg-[var(--accent)]/5 font-medium"
              )}
            >
              <span className="text-lg leading-none">{entry.flag}</span>
              <span className="flex-1 min-w-0 truncate text-[var(--foreground)]">
                {entry.name}
              </span>
              <span className="text-[var(--muted-foreground)] shrink-0">
                {entry.dialCode}
              </span>
            </button>
          </div>
        );
      })}
      {filteredCountries.length === 0 && (
        <div className="px-3 py-6 text-sm text-center text-[var(--muted-foreground)]">
          {noResults}
        </div>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-stretch rounded-xl border overflow-hidden bg-white/50 transition-all duration-200",
          "focus-within:ring-2 focus-within:ring-[var(--accent)]/50 focus-within:border-[var(--accent)]",
          error ? "border-red-500" : "border-[var(--border)]"
        )}
      >
        {isMobile ? (
          <Sheet
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) setSearch("");
            }}
          >
            <SheetTrigger asChild>{triggerButton()}</SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-2xl border-t border-[var(--border)] bg-[var(--card)] p-0 gap-0"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <SheetHeader className="px-4 pt-4 pb-1">
                <SheetTitle className="text-[15px] font-bold text-left">
                  {searchPlaceholder.replace(/\.\.\.$/, "")}
                </SheetTitle>
              </SheetHeader>
              <div className="px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                {searchBox}
                {list}
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          triggerButton(() => setOpen((o) => !o))
        )}

        <input
          ref={inputRef}
          id={id}
          type="tel"
          value={nationalInput}
          onChange={handleInputChange}
          onFocus={() => setOpen(false)}
          placeholder={placeholder || exampleNumber}
          required={required}
          className="
            flex-1 px-4 py-3.5 bg-transparent outline-none min-w-0
            text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]
          "
          autoComplete="tel-national"
        />
      </div>

      {/* Desktop: inline dropdown anchored above the field, inside the dialog. */}
      {!isMobile && open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 z-50 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg shadow-black/10">
          {searchBox}
          {list}
        </div>
      )}
    </div>
  );
}
