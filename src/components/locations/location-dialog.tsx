"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WizardField } from "@/components/onboarding/form/WizardField";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ApiError } from "@/api/client";
import {
  useCreateLocation,
  useUpdateLocation,
} from "@/hooks/use-locations";
import type {
  Location,
  LocationCreate,
  LocationPatch,
} from "@/types/location";
import {
  LocationSlugInput,
  type LocationSlugStatus,
} from "./location-slug-input";

type LocationDialogProps =
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      businessId: string;
      businessSlug?: string;
      mode: "create";
      /** True when the business has zero active locations. Hides the
       *  "Set as primary" toggle (auto-primary) and exposes a backfill
       *  checkbox on step 3 — the backend only honours `backfill_legacy`
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

const TOTAL_STEPS = 3;

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
  const [walletEn, setWalletEn] = useState<string>(
    initial?.wallet_message?.en ?? ""
  );
  const [walletFr, setWalletFr] = useState<string>(
    initial?.wallet_message?.fr ?? ""
  );
  // First-location only: tag all legacy NULL-location activity to this new
  // location. Defaults to false because the operation is irreversible.
  const [backfillLegacy, setBackfillLegacy] = useState(false);

  const hasCoords = lat.trim() !== "" || lng.trim() !== "";
  const willBePrimary = mode === "edit" && isPrimary && !initial?.is_primary;

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

  const handleSubmit = async () => {
    setFormError(null);

    if (willBePrimary) {
      const ok = window.confirm(tForm("setPrimaryConfirm"));
      if (!ok) return;
    }

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

          <WizardField label={tForm("slug")} required>
            <LocationSlugInput
              businessId={businessId}
              businessSlug={businessSlug}
              value={slug}
              onChange={handleSlugChange}
              excludeLocationId={initial?.id}
              initialValue={initial?.slug}
              onStatusChange={setSlugStatus}
              hideLabel
            />
          </WizardField>

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
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <WizardField
            label={tForm("address")}
            htmlFor="location-address"
            helper={tForm("addressHelp")}
          >
            <Textarea
              id="location-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="5 West Ave, Paris"
              rows={2}
            />
          </WizardField>

          <div className="grid grid-cols-2 gap-3">
            <WizardField label={tForm("lat")} htmlFor="location-lat">
              <Input
                id="location-lat"
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="48.86"
                className="h-11"
              />
            </WizardField>
            <WizardField label={tForm("lng")} htmlFor="location-lng">
              <Input
                id="location-lng"
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="2.30"
                className="h-11"
              />
            </WizardField>
          </div>
          <p className="wiz-helper text-[#999] -mt-2">
            {tForm("coordinatesHelp")}
          </p>

          {hasCoords && (
            <WizardField label={tForm("radius")} htmlFor="location-radius">
              <Input
                id="location-radius"
                type="number"
                min={10}
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                placeholder="100"
                className="h-11"
              />
            </WizardField>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          {isFirstLocation && (
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

          <p className="wiz-helper text-[#999] -mt-1">
            {tForm("walletMessageHelp")}
          </p>
          <WizardField label="EN" htmlFor="wm-en">
            <Input
              id="wm-en"
              value={walletEn}
              onChange={(e) => setWalletEn(e.target.value)}
              placeholder="Welcome to our Westside store!"
              className="h-11"
            />
          </WizardField>
          <WizardField label="FR" htmlFor="wm-fr">
            <Input
              id="wm-fr"
              value={walletFr}
              onChange={(e) => setWalletFr(e.target.value)}
              placeholder="Bienvenue dans notre boutique Westside !"
              className="h-11"
            />
          </WizardField>
        </div>
      )}

      {formError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-600 wiz-helper border border-red-100">
          {formError}
        </div>
      )}
    </div>
  );

  const header = (
    <div className="flex flex-col">
      {/* Progress bar */}
      <div className="h-[3px] bg-[var(--muted)]">
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="px-6 pt-5 pb-5 pr-12">
        <p className="wiz-helper font-medium uppercase tracking-wider text-[#999]">
          {tWiz("stepOf", { current: step, total: TOTAL_STEPS })}
        </p>
        <h2 className="wiz-h2 font-semibold text-[var(--foreground)] mt-1">
          {stepTitle}
        </h2>
        <p className="wiz-helper text-[#7A7A7A] mt-1">{stepSubtitle}</p>
      </div>
    </div>
  );

  const footer = (
    <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--background)]">
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
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side="bottom"
          className={cn(
            "flex flex-col gap-0 p-0 max-h-[90vh] rounded-t-2xl overflow-hidden border-t-0"
          )}
        >
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-[var(--border-dark)] opacity-60" />
          </div>
          <SheetTitle className="sr-only">{stepTitle}</SheetTitle>
          <SheetDescription className="sr-only">{stepSubtitle}</SheetDescription>
          {header}
          <div className="flex-1 overflow-y-auto px-6 py-5">{body}</div>
          {footer}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl flex flex-col gap-0 p-0 overflow-hidden">
        <DialogTitle className="sr-only">{stepTitle}</DialogTitle>
        {header}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">{body}</div>
        {footer}
      </DialogContent>
    </Dialog>
  );
}
