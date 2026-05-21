"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LocationSlugInput } from "./location-slug-input";
import { ApiError } from "@/api/client";
import type {
  Location,
  LocationCreate,
  LocationPatch,
} from "@/types/location";

/** Convert a name into a default slug. Server normalizes too (the
 *  authoritative output is `useSlugCheck().normalized`); this is a
 *  cosmetic helper for the auto-populated value. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

interface LocationFormProps {
  businessId: string;
  businessSlug?: string;
  /** Provide the existing record in edit mode. Omit for create mode. */
  initial?: Location;
  /** "create" hides the is_primary toggle; "edit" shows it (disabled if
   *  the location is already primary). */
  mode: "create" | "edit";
  /** Pro feature gate. When false, non-primary edits / non-primary creates
   *  are forbidden — the submit button is disabled with a tooltip. The
   *  caller is responsible for rendering an upsell card around the form
   *  in those cases, but we still want the disabled state as a fallback. */
  canEditNonPrimary: boolean;
  onSubmit: (body: LocationCreate | LocationPatch) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function LocationForm({
  businessId,
  businessSlug,
  initial,
  mode,
  canEditNonPrimary,
  onSubmit,
  onCancel,
  submitLabel,
}: LocationFormProps) {
  const t = useTranslations("loyaltyProgram.locations.form");

  const [name, setName] = useState(initial?.name ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [lat, setLat] = useState<string>(
    initial?.latitude != null ? String(initial.latitude) : ""
  );
  const [lng, setLng] = useState<string>(
    initial?.longitude != null ? String(initial.longitude) : ""
  );
  const [radius, setRadius] = useState<string>(
    String(initial?.radius_meters ?? 100)
  );
  const [isPrimary, setIsPrimary] = useState<boolean>(
    initial?.is_primary ?? false
  );
  const [walletMessageOpen, setWalletMessageOpen] = useState(false);
  const [walletEn, setWalletEn] = useState<string>(
    initial?.wallet_message?.en ?? ""
  );
  const [walletFr, setWalletFr] = useState<string>(
    initial?.wallet_message?.fr ?? ""
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ slug?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Auto-derive slug from name until the user touches the slug field.
  const handleNameChange = (next: string) => {
    setName(next);
    if (!slugTouched) setSlug(slugify(next));
  };

  const handleSlugChange = (next: string) => {
    setSlugTouched(true);
    setSlug(next);
    setFieldErrors((prev) => ({ ...prev, slug: undefined }));
  };

  const hasCoords = lat.trim() !== "" || lng.trim() !== "";
  const willBePrimary = mode === "edit" && isPrimary && !initial?.is_primary;

  const submitDisabled = useMemo(() => {
    if (submitting) return true;
    if (!name.trim()) return true;
    if (!slug.trim()) return true;
    // Non-Pro safety net: editing a non-primary location is forbidden.
    if (mode === "edit" && initial && !initial.is_primary && !canEditNonPrimary)
      return true;
    return false;
  }, [submitting, name, slug, mode, initial, canEditNonPrimary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (willBePrimary) {
      const ok = window.confirm(t("setPrimaryConfirm"));
      if (!ok) return;
    }

    const parseFloatOrNull = (s: string): number | null => {
      const trimmed = s.trim();
      if (trimmed === "") return null;
      const n = parseFloat(trimmed);
      return Number.isFinite(n) ? n : null;
    };

    const body: LocationCreate | LocationPatch = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      address: address.trim() || undefined,
      latitude: parseFloatOrNull(lat),
      longitude: parseFloatOrNull(lng),
      radius_meters: hasCoords ? parseInt(radius || "100", 10) : undefined,
      wallet_message:
        walletEn || walletFr ? { en: walletEn, fr: walletFr } : null,
    };
    if (mode === "edit" && isPrimary !== !!initial?.is_primary) {
      body.is_primary = isPrimary;
    }

    setSubmitting(true);
    try {
      await onSubmit(body);
    } catch (err) {
      if (err instanceof ApiError && err.code === "SLUG_TAKEN") {
        setFieldErrors({ slug: t("slugTaken") });
      } else {
        setFormError(
          err instanceof Error ? err.message : t("genericError")
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
          <span className="text-sm">⚠</span>
          {formError}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="location-name">{t("name")}</Label>
        <Input
          id="location-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Westside"
          required
        />
      </div>

      <LocationSlugInput
        businessId={businessId}
        businessSlug={businessSlug}
        value={slug}
        onChange={handleSlugChange}
        excludeLocationId={initial?.id}
        initialValue={initial?.slug}
      />
      {fieldErrors.slug && (
        <p className="text-xs text-red-500 -mt-2">{fieldErrors.slug}</p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="location-address">{t("address")}</Label>
        <Textarea
          id="location-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="5 West Ave, Paris"
          rows={2}
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          {t("addressHelp")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="location-lat">{t("lat")}</Label>
          <Input
            id="location-lat"
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="48.86"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="location-lng">{t("lng")}</Label>
          <Input
            id="location-lng"
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="2.30"
          />
        </div>
      </div>
      <p className="text-xs text-[var(--muted-foreground)] -mt-2">
        {t("coordinatesHelp")}
      </p>

      {hasCoords && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="location-radius">{t("radius")}</Label>
          <Input
            id="location-radius"
            type="number"
            min={10}
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            placeholder="100"
          />
        </div>
      )}

      {/* Wallet message — collapsible since it's an advanced/future field */}
      <div className="border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={() => setWalletMessageOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-[#555] hover:text-[#1A1A1A]"
        >
          {walletMessageOpen ? (
            <CaretDownIcon className="h-4 w-4" />
          ) : (
            <CaretRightIcon className="h-4 w-4" />
          )}
          {t("walletMessage")}
        </button>
        {walletMessageOpen && (
          <div className="mt-3 space-y-3 pl-6">
            <p className="text-xs text-[var(--muted-foreground)]">
              {t("walletMessageHelp")}
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wm-en">EN</Label>
              <Input
                id="wm-en"
                value={walletEn}
                onChange={(e) => setWalletEn(e.target.value)}
                placeholder="Welcome to our Westside store!"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wm-fr">FR</Label>
              <Input
                id="wm-fr"
                value={walletFr}
                onChange={(e) => setWalletFr(e.target.value)}
                placeholder="Bienvenue dans notre boutique Westside !"
              />
            </div>
          </div>
        )}
      </div>

      {/* Set as primary — edit mode only; disabled if already primary */}
      {mode === "edit" && (
        <label className="flex items-start gap-2 cursor-pointer pt-2 border-t border-[var(--border)]">
          <input
            type="checkbox"
            checked={isPrimary}
            disabled={initial?.is_primary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span className="text-sm">
            <span className="font-medium text-[#1A1A1A]">
              {t("setPrimary")}
            </span>
            {initial?.is_primary && (
              <span className="block text-xs text-[var(--muted-foreground)] mt-0.5">
                {t("alreadyPrimary")}
              </span>
            )}
          </span>
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-full"
          onClick={onCancel}
        >
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          variant="gradient"
          disabled={submitDisabled}
          className="flex-1"
        >
          {submitting
            ? t("saving")
            : (submitLabel ?? (mode === "create" ? t("create") : t("save")))}
        </Button>
      </div>
    </form>
  );
}
