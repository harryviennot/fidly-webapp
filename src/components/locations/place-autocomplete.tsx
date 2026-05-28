"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MagnifyingGlassIcon, SpinnerIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { loadPlacesLibrary } from "@/lib/google-maps";
import { parseGooglePlace, type ParsedPlace } from "@/lib/google-places";

interface Suggestion {
  placePrediction: google.maps.places.PlacePrediction;
  primary: string;
  secondary: string;
}

interface PlaceAutocompleteProps {
  onPlaceSelected: (parsed: ParsedPlace) => void;
  defaultValue?: string;
  placeholder?: string;
  inputId?: string;
  disabled?: boolean;
}

const DEBOUNCE_MS = 200;

export function PlaceAutocomplete({
  onPlaceSelected,
  defaultValue = "",
  placeholder,
  inputId,
  disabled,
}: PlaceAutocompleteProps) {
  const t = useTranslations("loyaltyProgram.locations.form");
  const locale = useLocale();

  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null
  );
  const placesLibRef = useRef<google.maps.PlacesLibrary | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ensureLibrary = useCallback(async () => {
    if (placesLibRef.current) return placesLibRef.current;
    const lib = await loadPlacesLibrary();
    placesLibRef.current = lib;
    return lib;
  }, []);

  const ensureSessionToken = useCallback(async () => {
    if (sessionTokenRef.current) return sessionTokenRef.current;
    const lib = await ensureLibrary();
    sessionTokenRef.current = new lib.AutocompleteSessionToken();
    return sessionTokenRef.current;
  }, [ensureLibrary]);

  const fetchSuggestions = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (trimmed.length < 2) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const lib = await ensureLibrary();
        const token = await ensureSessionToken();

        const { suggestions: results } =
          await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: trimmed,
            sessionToken: token,
            language: locale,
          });

        const mapped: Suggestion[] = results
          .map((s) => {
            const pp = s.placePrediction;
            if (!pp) return null;
            return {
              placePrediction: pp,
              primary: pp.mainText?.toString() ?? pp.text.toString(),
              secondary: pp.secondaryText?.toString() ?? "",
            } satisfies Suggestion;
          })
          .filter((s): s is Suggestion => s !== null);

        setSuggestions(mapped);
        setHighlightedIndex(mapped.length > 0 ? 0 : -1);
      } catch (err) {
        console.error("Places autocomplete failed", err);
        setError(t("autocompleteError"));
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [ensureLibrary, ensureSessionToken, locale, t]
  );

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!open) return;
    debounceTimerRef.current = setTimeout(() => {
      void fetchSuggestions(query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, open, fetchSuggestions]);

  const handleSelect = useCallback(
    async (suggestion: Suggestion) => {
      try {
        setLoading(true);
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ["id", "formattedAddress", "addressComponents", "location"],
        });
        const parsed = parseGooglePlace({
          id: place.id,
          formattedAddress: place.formattedAddress,
          addressComponents: place.addressComponents as
            | google.maps.places.AddressComponent[]
            | null,
          location: place.location,
        });
        if (!parsed) {
          setError(t("autocompleteError"));
          return;
        }
        onPlaceSelected(parsed);
        setQuery(parsed.addressComponents.formatted ?? suggestion.primary);
        setOpen(false);
        setSuggestions([]);
        // A session token is single-use: one Place Details fetch consumes it.
        // Reset so the next search opens a fresh session.
        sessionTokenRef.current = null;
      } catch (err) {
        console.error("Place details failed", err);
        setError(t("autocompleteError"));
      } finally {
        setLoading(false);
      }
    },
    [onPlaceSelected, t]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(
        (i) => (i - 1 + suggestions.length) % suggestions.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0) {
        void handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = useMemo(
    () => open && (loading || suggestions.length > 0 || error !== null),
    [open, loading, suggestions.length, error]
  );

  return (
    <Popover open={showDropdown} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <MagnifyingGlassIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999] pointer-events-none"
            weight="bold"
          />
          <Input
            ref={inputRef}
            id={inputId}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (e.target.value.trim().length < 2) setSuggestions([]);
            }}
            onFocus={() => {
              if (suggestions.length > 0 || query.trim().length >= 2) {
                setOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? t("searchAddressPlaceholder")}
            autoComplete="off"
            disabled={disabled}
            className="h-11 pl-9"
          />
          {loading && (
            <SpinnerIcon
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999] animate-spin"
              weight="bold"
            />
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[var(--radix-popover-trigger-width)] p-0 max-h-72 overflow-y-auto"
      >
        {error && (
          <div className="px-3 py-2 wiz-helper text-red-600">{error}</div>
        )}
        {!error && suggestions.length === 0 && !loading && (
          <div className="px-3 py-2 wiz-helper text-[#999]">
            {t("autocompleteEmpty")}
          </div>
        )}
        {!error && suggestions.length > 0 && (
          <ul role="listbox" className="py-1">
            {suggestions.map((s, idx) => (
              <li
                key={s.placePrediction.placeId ?? idx}
                role="option"
                aria-selected={idx === highlightedIndex}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  void handleSelect(s);
                }}
                className={cn(
                  "px-3 py-2 cursor-pointer flex flex-col gap-0.5",
                  idx === highlightedIndex && "bg-[var(--muted)]"
                )}
              >
                <span className="wiz-body-sm font-medium text-[var(--foreground)]">
                  {s.primary}
                </span>
                {s.secondary && (
                  <span className="wiz-helper text-[#7A7A7A]">
                    {s.secondary}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
