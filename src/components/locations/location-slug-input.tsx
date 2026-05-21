"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircleIcon, WarningCircleIcon, SpinnerIcon } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSlugCheck } from "@/hooks/use-locations";

interface LocationSlugInputProps {
  businessId: string;
  businessSlug?: string;
  value: string;
  onChange: (slug: string) => void;
  /** When editing a location, exclude its own row from the collision check. */
  excludeLocationId?: string;
  disabled?: boolean;
  /** Initial value used to detect if the user has touched the field — auto-
   *  derivation from name stops once they do. */
  initialValue?: string;
}

export function LocationSlugInput({
  businessId,
  businessSlug,
  value,
  onChange,
  excludeLocationId,
  disabled,
  initialValue,
}: LocationSlugInputProps) {
  const t = useTranslations("loyaltyProgram.locations.form");
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value.trim()), 300);
    return () => clearTimeout(id);
  }, [value]);

  // Skip the check if the value is unchanged from initial — saves a network
  // call when opening the edit form and not touching slug.
  const enabled = !!debounced && debounced !== initialValue;

  const { data, isFetching } = useSlugCheck(
    enabled ? businessId : undefined,
    debounced,
    excludeLocationId
  );

  const showStatus = enabled && debounced.length > 0;
  const status = useMemo(() => {
    if (!showStatus) return null;
    if (isFetching) return "checking" as const;
    if (!data) return null;
    return data.available ? ("available" as const) : ("taken" as const);
  }, [showStatus, isFetching, data]);

  const normalized = data?.normalized ?? debounced;
  const urlPreview = businessSlug
    ? `app.stampeo.app/${businessSlug}/l/${normalized}`
    : `app.stampeo.app/<business>/l/${normalized}`;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="location-slug">{t("slug")}</Label>
      <div className="relative">
        <Input
          id="location-slug"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="westside"
          aria-invalid={status === "taken"}
          className="pr-8"
        />
        {status && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            {status === "checking" && (
              <SpinnerIcon className="h-4 w-4 text-[#A0A0A0] animate-spin" />
            )}
            {status === "available" && (
              <CheckCircleIcon
                className="h-4 w-4 text-green-600"
                weight="fill"
              />
            )}
            {status === "taken" && (
              <WarningCircleIcon
                className="h-4 w-4 text-red-500"
                weight="fill"
              />
            )}
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">{urlPreview}</p>
      {status === "taken" && (
        <p className="text-xs text-red-500">{t("slugTaken")}</p>
      )}
    </div>
  );
}
