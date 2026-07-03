"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeftIcon, CheckCircleIcon, PencilSimpleIcon, XIcon } from "@phosphor-icons/react";
import { Drawer as VaulDrawer } from "vaul";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfoBox } from "@/components/reusables/info-box";
import { WizardField } from "@/components/onboarding/form/WizardField";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ApiError } from "@/api/client";
import {
  useCreateLocation,
  useUpdateLocation,
} from "@/hooks/use-locations";
import type {
  AddressComponents,
  Location,
  LocationCreate,
  LocationPatch,
} from "@/types/location";
import {
  LocationSlugInput,
  type LocationSlugStatus,
} from "./location-slug-input";
import { PlaceAutocomplete } from "./place-autocomplete";
import type { ParsedPlace } from "@/lib/google-places";

type LocationDialogProps =
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      businessId: string;
      businessSlug?: string;
      mode: "create";
      /** True when the business has zero active locations. Hides the
       *  "Set as primary" toggle (auto-primary) and exposes a backfill
       *  checkbox on step 1. The backend only honours `backfill_legacy`
       *  on the first location. */
      isFirstLocation?: boolean;
    }
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      businessId: string;
      businessSlug?: string;
      mode: "edit";
      location: Location;
      canManageNonPrimary: boolean;
    };

const TOTAL_STEPS = 2;

/** Convert a name into a default slug. Server normalizes too (the
 *  authoritative output is `useSlugCheck().normalized`); this is a cosmetic
 *  helper for the auto-populated value. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

interface ParsedFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

function ParsedField({ label, value, onChange, className }: ParsedFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1 min-w-0", className)}>
      <span className="wiz-helper text-[#7A7A7A] uppercase tracking-wider">
        {label}
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="wiz-helper text-[#7A7A7A] uppercase tracking-wider">
        {label}
      </span>
      <span className="wiz-body-sm text-[var(--foreground)] whitespace-normal break-words">
        {value || "—"}
      </span>
    </div>
  );
}

export function LocationDialog(props: LocationDialogProps) {
  const { open, onOpenChange, businessId, businessSlug, mode } = props;
  const isMobile = useIsMobile();
  const tWiz = useTranslations("loyaltyProgram.locations.wizard");
  const tForm = useTranslations("loyaltyProgram.locations.form");
  const tCreate = useTranslations("loyaltyProgram.locations.create");
  const tDetail = useTranslations("loyaltyProgram.locations.detail");

  const create = useCreateLocation(businessId);
  const update = useUpdateLocation(businessId);

  const initial = mode === "edit" ? props.location : undefined;
  const isFirstLocation = mode === "create" && !!props.isFirstLocation;

  // ─── Wizard state ────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── Form state ──────────────────────────────────────────────────────
  const [name, setName] = useState(initial?.name ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugStatus, setSlugStatus] = useState<LocationSlugStatus>("idle");
  const [lat, setLat] = useState<string>(
    initial?.latitude != null ? String(initial.latitude) : ""
  );
  const [lng, setLng] = useState<string>(
    initial?.longitude != null ? String(initial.longitude) : ""
  );
  // Parsed address from Google Places (or null in manual mode / legacy edit).
  // For legacy edits with only the free-form `address` text, seed the street
  // field with it so the data isn't lost — the user can re-split it manually.
  const [addressComponents, setAddressComponents] = useState<AddressComponents | null>(
    () => {
      if (initial?.address_components) return initial.address_components;
      if (initial?.address) return { street: initial.address };
      return null;
    }
  );
  // Wizard starts in autocomplete mode unless this is an edit with no parsed
  // components but legacy text — then fall back to manual so the user sees
  // their existing data without having to re-search.
  const [addressMode, setAddressMode] = useState<"autocomplete" | "manual">(
    () => {
      if (initial?.address_components?.formatted) return "autocomplete";
      if (initial?.address) return "manual";
      return "autocomplete";
    }
  );
  const [editingDetails, setEditingDetails] = useState(false);
  const [isPrimary, setIsPrimary] = useState<boolean>(
    initial?.is_primary ?? false
  );
  // First-location only: tag all legacy NULL-location activity to this new
  // location. Defaults to false because the operation is irreversible.
  const [backfillLegacy, setBackfillLegacy] = useState(false);

  const willBePrimary = mode === "edit" && isPrimary && !initial?.is_primary;
  const slugLocked = mode === "edit";

  const handleNameChange = (next: string) => {
    setName(next);
    if (!slugTouched) setSlug(slugify(next));
  };

  const handleSlugChange = (next: string) => {
    setSlugTouched(true);
    setSlug(next);
  };

  // ─── Per-step validation ─────────────────────────────────────────────
  const step1Valid = useMemo(() => {
    if (!name.trim() || !slug.trim()) return false;
    // Edit mode: allow advancing as long as slug hasn't changed OR it's
    // available. In create mode the slug must explicitly be "available".
    if (mode === "edit" && slug === initial?.slug) return true;
    return slugStatus === "available";
  }, [name, slug, slugStatus, mode, initial?.slug]);

  const reset = () => {
    setStep(1);
    setSubmitting(false);
    setFormError(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const parseFloatOrNull = (s: string): number | null => {
    const trimmed = s.trim();
    if (trimmed === "") return null;
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  const handlePlaceSelected = (parsed: ParsedPlace) => {
    setAddressComponents(parsed.addressComponents);
    setLat(String(parsed.latitude));
    setLng(String(parsed.longitude));
    setEditingDetails(false);
  };

  const synthesizeFormatted = (c: AddressComponents | null): string => {
    if (!c) return "";
    if (c.formatted && c.formatted.trim()) return c.formatted.trim();
    const cityLine = [c.postal_code, c.city].filter(Boolean).join(" ").trim();
    return [c.street, cityLine, c.country].filter(Boolean).join(", ").trim();
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (willBePrimary) {
      const ok = window.confirm(tForm("setPrimaryConfirm"));
      if (!ok) return;
    }

    // Components are the source of truth in both modes; in manual mode we
    // also synthesize `address_components.formatted` from the parts so the
    // backend has a single canonical display string. `address` mirrors it
    // for back-compat with rows that pre-date the structured column.
    const componentsForSave: AddressComponents | null =
      addressComponents && Object.values(addressComponents).some((v) => v)
        ? {
            ...addressComponents,
            formatted:
              addressComponents.formatted?.trim() ||
              synthesizeFormatted(addressComponents) ||
              undefined,
          }
        : null;
    const formattedText = componentsForSave?.formatted ?? "";

    const body: LocationCreate | LocationPatch = {
      name: name.trim(),
      // The slug is immutable after creation. Only send it on create — re-sending
      // it on a name-only edit would trip the backend immutability guard when the
      // stored slug is malformed (a legacy row).
      slug: mode === "create" ? slug.trim() || undefined : undefined,
      address: formattedText || undefined,
      address_components: componentsForSave ?? undefined,
      latitude: parseFloatOrNull(lat),
      longitude: parseFloatOrNull(lng),
    };
    if (mode === "edit" && isPrimary !== !!initial?.is_primary) {
      body.is_primary = isPrimary;
    }
    // First-create: the only-location IS the primary; we don't show the
    // toggle so we set it explicitly. Also forward the backfill choice.
    if (mode === "create" && isFirstLocation) {
      (body as LocationCreate).is_primary = true;
      (body as LocationCreate).backfill_legacy = backfillLegacy;
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        const created = await create.mutateAsync(body as LocationCreate);
        if (created.backfill?.backfilled) {
          toast.success(
            tCreate("backfillToast", {
              transactions: created.backfill.transactions,
              customers: created.backfill.customers,
              name: created.name,
            })
          );
        } else {
          toast.success(tCreate("successToast"));
        }
      } else {
        await update.mutateAsync({ locationId: props.location.id, body });
        toast.success(tDetail("savedToast"));
      }
      handleClose(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === "SLUG_TAKEN") {
        setFormError(tForm("slugTaken"));
        setStep(1);
      } else {
        setFormError(
          err instanceof Error ? err.message : tForm("genericError")
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      void handleSubmit();
    }
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
    else handleClose(false);
  };

  // ─── Step content ────────────────────────────────────────────────────
  const stepTitle = tWiz(`step${step}.title`);
  const stepSubtitle = tWiz(`step${step}.subtitle`);
  const progressPct = (step / TOTAL_STEPS) * 100;
  const isLastStep = step === TOTAL_STEPS;
  const nextDisabled =
    submitting || ((step === 1 || isLastStep) && !step1Valid);

  const nextLabel = isLastStep
    ? mode === "create"
      ? tWiz("create")
      : tWiz("save")
    : tWiz("next");

  const body = (
    <div className="flex flex-col gap-6 animate-slide-up">
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <WizardField label={tForm("name")} htmlFor="location-name" required>
            <Input
              id="location-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Westside"
              autoComplete="off"
              autoFocus
              className="h-11"
            />
          </WizardField>

          <WizardField
            label={tForm("slug")}
            required
            helper={slugLocked ? tForm("slugLockedHelper") : undefined}
          >
            <LocationSlugInput
              businessId={businessId}
              businessSlug={businessSlug}
              value={slug}
              onChange={handleSlugChange}
              excludeLocationId={initial?.id}
              initialValue={initial?.slug}
              onStatusChange={setSlugStatus}
              disabled={slugLocked}
              hideLabel
            />
          </WizardField>

          {mode === "create" && (
            <InfoBox
              variant="warning"
              title={tWiz("slugLockedWarning.title")}
              message={tWiz("slugLockedWarning.message")}
            />
          )}

          {mode === "edit" && (
            <label className="flex items-start gap-3 cursor-pointer pt-3 border-t border-[var(--border)]">
              <input
                type="checkbox"
                checked={isPrimary}
                disabled={initial?.is_primary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span className="flex flex-col gap-0.5">
                <span className="wiz-body-sm font-medium text-[var(--foreground)]">
                  {tWiz("primaryLabel")}
                </span>
                <span className="wiz-helper text-[#999]">
                  {initial?.is_primary
                    ? tWiz("alreadyPrimary")
                    : tWiz("primaryHelp")}
                </span>
              </span>
            </label>
          )}

          {mode === "create" && isFirstLocation && (
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/40">
              <input
                type="checkbox"
                checked={backfillLegacy}
                onChange={(e) => setBackfillLegacy(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span className="flex flex-col gap-0.5">
                <span className="wiz-body-sm font-medium text-[var(--foreground)]">
                  {tWiz("backfill.label")}
                </span>
                <span className="wiz-helper text-[#7A7A7A]">
                  {tWiz("backfill.help")}
                </span>
              </span>
            </label>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          {addressMode === "autocomplete" ? (
            <>
              <WizardField
                label={tForm("searchAddress")}
                htmlFor="location-place-search"
              >
                <PlaceAutocomplete
                  inputId="location-place-search"
                  defaultValue={addressComponents?.formatted ?? ""}
                  onPlaceSelected={handlePlaceSelected}
                />
              </WizardField>

              {addressComponents && addressComponents.formatted && (
                <div className="flex flex-col gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/40">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon
                      className="h-4 w-4 text-emerald-600 shrink-0"
                      weight="fill"
                    />
                    <span className="wiz-body-sm font-medium text-[var(--foreground)] flex-1 min-w-0">
                      {tForm("positionConfirmed")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingDetails((v) => !v)}
                      className="wiz-helper text-[var(--accent)] hover:underline flex items-center gap-1 shrink-0"
                    >
                      <PencilSimpleIcon className="h-3 w-3" weight="bold" />
                      {editingDetails ? tForm("done") : tForm("editDetails")}
                    </button>
                  </div>

                  {editingDetails ? (
                    <div className="grid grid-cols-3 gap-x-3 gap-y-3">
                      <ParsedField
                        label={tForm("addressLine")}
                        value={addressComponents.street ?? ""}
                        onChange={(v) =>
                          setAddressComponents((c) => ({ ...(c ?? {}), street: v }))
                        }
                        className="col-span-3"
                      />
                      <ParsedField
                        label={tForm("postalCode")}
                        value={addressComponents.postal_code ?? ""}
                        onChange={(v) =>
                          setAddressComponents((c) => ({
                            ...(c ?? {}),
                            postal_code: v,
                          }))
                        }
                      />
                      <ParsedField
                        label={tForm("city")}
                        value={addressComponents.city ?? ""}
                        onChange={(v) =>
                          setAddressComponents((c) => ({ ...(c ?? {}), city: v }))
                        }
                        className="col-span-2"
                      />
                      <ParsedField
                        label={tForm("country")}
                        value={addressComponents.country ?? ""}
                        onChange={(v) =>
                          setAddressComponents((c) => ({ ...(c ?? {}), country: v }))
                        }
                        className="col-span-3"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-[3fr_2fr] gap-x-3 gap-y-3">
                      <ReadOnlyField
                        label={tForm("addressLine")}
                        value={addressComponents.street ?? ""}
                      />
                      <ReadOnlyField
                        label={tForm("city")}
                        value={addressComponents.city ?? ""}
                      />
                      <ReadOnlyField
                        label={tForm("postalCode")}
                        value={addressComponents.postal_code ?? ""}
                      />
                      <ReadOnlyField
                        label={tForm("country")}
                        value={addressComponents.country ?? ""}
                      />
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setAddressMode("manual")}
                className="wiz-helper text-[var(--accent)] hover:underline self-start"
              >
                {tForm("cannotFindBusiness")}
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <WizardField label={tForm("addressLine")} htmlFor="manual-street">
                  <Input
                    id="manual-street"
                    value={addressComponents?.street ?? ""}
                    onChange={(e) =>
                      setAddressComponents((c) => ({ ...(c ?? {}), street: e.target.value }))
                    }
                    placeholder="5 West Ave"
                    className="h-11"
                  />
                </WizardField>
                <WizardField label={tForm("city")} htmlFor="manual-city">
                  <Input
                    id="manual-city"
                    value={addressComponents?.city ?? ""}
                    onChange={(e) =>
                      setAddressComponents((c) => ({ ...(c ?? {}), city: e.target.value }))
                    }
                    placeholder="Paris"
                    className="h-11"
                  />
                </WizardField>
                <WizardField label={tForm("postalCode")} htmlFor="manual-postal">
                  <Input
                    id="manual-postal"
                    value={addressComponents?.postal_code ?? ""}
                    onChange={(e) =>
                      setAddressComponents((c) => ({ ...(c ?? {}), postal_code: e.target.value }))
                    }
                    placeholder="75001"
                    className="h-11"
                  />
                </WizardField>
                <WizardField label={tForm("country")} htmlFor="manual-country">
                  <Input
                    id="manual-country"
                    value={addressComponents?.country ?? ""}
                    onChange={(e) =>
                      setAddressComponents((c) => ({ ...(c ?? {}), country: e.target.value }))
                    }
                    placeholder="France"
                    className="h-11"
                  />
                </WizardField>
              </div>

              <button
                type="button"
                onClick={() => setAddressMode("autocomplete")}
                className="wiz-helper text-[var(--accent)] hover:underline self-start"
              >
                {tForm("useAutocomplete")}
              </button>
            </>
          )}
        </div>
      )}

      {formError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-600 wiz-helper border border-red-100">
          {formError}
        </div>
      )}
    </div>
  );

  const progressBar = (
    <div className="h-[3px] bg-[var(--muted)] shrink-0">
      <div
        className="h-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
        style={{ width: `${progressPct}%` }}
      />
    </div>
  );

  const titleBlock = (
    <div className="px-6 pt-5 pb-5 pr-12">
      <p className="wiz-helper font-medium uppercase tracking-wider text-[#999]">
        {tWiz("stepOf", { current: step, total: TOTAL_STEPS })}
      </p>
      <h2 className="wiz-h font-semibold text-[var(--foreground)] mt-2">
        {stepTitle}
      </h2>
      <p className="wiz-body-sm text-[#7A7A7A] mt-2">{stepSubtitle}</p>
    </div>
  );

  const footer = (
    <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--background)] shrink-0">
      <Button
        type="button"
        variant="ghost"
        onClick={goBack}
        disabled={submitting}
        className="rounded-full"
      >
        {step === 1 ? (
          tForm("cancel")
        ) : (
          <>
            <ArrowLeftIcon className="h-4 w-4" weight="bold" />
            {tWiz("back")}
          </>
        )}
      </Button>
      <div className="flex-1" />
      <Button
        type="button"
        variant="gradient"
        onClick={goNext}
        disabled={nextDisabled}
      >
        {submitting && isLastStep ? tForm("saving") : nextLabel}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <VaulDrawer.Root
        open={open}
        onOpenChange={handleClose}
        dismissible
        handleOnly
        repositionInputs={false}
      >
        <VaulDrawer.Portal>
          <VaulDrawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <VaulDrawer.Content className="fixed inset-0 z-50 flex flex-col bg-[var(--background)] outline-hidden">
            <VaulDrawer.Title className="sr-only">{stepTitle}</VaulDrawer.Title>
            <VaulDrawer.Description className="sr-only">
              {stepSubtitle}
            </VaulDrawer.Description>

            {progressBar}

            <button
              type="button"
              onClick={() => handleClose(false)}
              aria-label={tForm("cancel")}
              className="absolute right-3 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full text-[var(--foreground)] hover:bg-[var(--muted)]"
            >
              <XIcon className="h-5 w-5" weight="bold" />
            </button>

            <div className="flex-1 overflow-y-auto">
              {titleBlock}
              <div className="px-6 pb-6">{body}</div>
            </div>

            {footer}
          </VaulDrawer.Content>
        </VaulDrawer.Portal>
      </VaulDrawer.Root>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl flex flex-col gap-0 p-0 overflow-hidden">
        <DialogTitle className="sr-only">{stepTitle}</DialogTitle>
        <div className="flex flex-col shrink-0">
          {progressBar}
          {titleBlock}
        </div>
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">{body}</div>
        {footer}
      </DialogContent>
    </Dialog>
  );
}
