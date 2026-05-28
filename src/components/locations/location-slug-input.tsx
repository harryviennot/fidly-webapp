"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircleIcon, WarningCircleIcon, SpinnerIcon } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSlugCheck } from "@/hooks/use-locations";

export type LocationSlugStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken";

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
  /** Fires on every status change so the wizard can gate its Continue button
   *  on availability. */
  onStatusChange?: (status: LocationSlugStatus) => void;
  /** Hide the label — the wizard renders its own via WizardField. */
  hideLabel?: boolean;
}

export function LocationSlugInput({
  businessId,
  businessSlug,
  value,
  onChange,
  excludeLocationId,
  disabled,
  initialValue,
  onStatusChange,
  hideLabel,
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
  const status: LocationSlugStatus = useMemo(() => {
    if (!showStatus) return "idle";
    if (isFetching) return "checking";
    if (!data) return "checking";
    return data.available ? "available" : "taken";
  }, [showStatus, isFetching, data]);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const normalized = data?.normalized ?? debounced;
  const urlPreview = businessSlug
    ? `app.stampeo.app/${businessSlug}/l/${normalized}`
    : `app.stampeo.app/<business>/l/${normalized}`;

  return (
    <div className="flex flex-col gap-2">
      {!hideLabel && <Label htmlFor="location-slug">{t("slug")}</Label>}
      <div className="relative">
        <Input
          id="location-slug"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="westside"
          aria-invalid={status === "taken"}
          className="h-11 pr-9"
        />
        {status !== "idle" && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
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
      <p className="wiz-helper text-[#999]">{urlPreview}</p>
      {status === "taken" && (
        <p className="wiz-helper text-red-600 font-medium">{t("slugTaken")}</p>
      )}
    </div>
  );
}
