"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Stamp, MapPin, EyeSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useLocations } from "@/hooks/use-locations";
import { useAddStamp } from "@/hooks/use-customers";
import { ApiError } from "@/api/client";
import { toast } from "sonner";

const REASON_MAX = 280;
const NO_LOCATION = "__none__";

interface StampAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  customerId: string;
  customerName: string;
  enrollmentId: string;
  /** Fired after a successful adjustment — caller invalidates anything extra. */
  onSuccess?: () => void;
}

export function StampAdjustmentDialog({
  open,
  onOpenChange,
  businessId,
  customerId,
  customerName,
  enrollmentId,
  onSuccess,
}: StampAdjustmentDialogProps) {
  const t = useTranslations("customers.actions.adjustment");
  const tShared = useTranslations("customers.actions");
  const { hasFeature } = useEntitlements();
  const addStampMutation = useAddStamp(businessId);

  const showLocationPicker = hasFeature("locations.multiple");
  const { data: locations } = useLocations(showLocationPicker ? businessId : undefined);

  const activeLocations = (locations ?? []).filter((l) => !l.deleted_at);
  const hasLocations = activeLocations.length > 0;

  const [reason, setReason] = useState("");
  const [locationValue, setLocationValue] = useState<string>(NO_LOCATION);

  const chips = [t("chip1"), t("chip2"), t("chip3")];

  const resetState = () => {
    setReason("");
    setLocationValue(NO_LOCATION);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetState();
    onOpenChange(next);
  };

  const reasonTrimmed = reason.trim();
  const canSubmit = reasonTrimmed.length > 0 && !addStampMutation.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const locationId =
      showLocationPicker && hasLocations && locationValue !== NO_LOCATION
        ? locationValue
        : null;
    try {
      await addStampMutation.mutateAsync({
        customerId,
        enrollmentId,
        reason: reasonTrimmed,
        locationId,
      });
      toast.success(tShared("stampAddedToast"));
      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? mapAdjustmentError(error, (k) => t(k as Parameters<typeof t>[0]))
          : error instanceof Error
            ? error.message
            : tShared("stampFailedToast");
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[400px] gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center shrink-0">
            <Stamp className="w-5 h-5" weight="duotone" style={{ color: "var(--accent)" }} />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-[17px] leading-tight">{t("title")}</DialogTitle>
            <DialogDescription className="text-[13px] mt-0.5 truncate">
              {customerName}
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="adjustment-reason"
            className="text-[13px] font-medium text-[var(--foreground)]"
          >
            {t("reasonLabel")}
          </label>
          <Textarea
            id="adjustment-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reasonPlaceholder")}
            maxLength={REASON_MAX}
            rows={3}
            autoFocus
            className="resize-none focus-visible:ring-[var(--accent)]/30 focus-visible:border-[var(--accent)]"
          />
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => {
              const active = reason.trim() === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setReason(active ? "" : c)}
                  className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all ${
                    active
                      ? "bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)]"
                      : "bg-white border-[var(--border)] text-[var(--muted-gray)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] mt-0.5">
            <EyeSlash className="w-3 h-3 shrink-0" weight="bold" />
            {t("reasonHelp")}
          </p>
        </div>

        {showLocationPicker && hasLocations && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="adjustment-location"
              className="text-[13px] font-medium text-[var(--foreground)] flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              {t("locationLabel")}
            </label>
            <Select value={locationValue} onValueChange={setLocationValue}>
              <SelectTrigger id="adjustment-location" className="h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_LOCATION}>
                  <span className="text-[var(--muted-foreground)]">{t("noLocation")}</span>
                </SelectItem>
                {activeLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            className="rounded-full h-9 px-4 text-[var(--muted-gray)]"
            onClick={() => handleOpenChange(false)}
            disabled={addStampMutation.isPending}
          >
            {tShared("cancel")}
          </Button>
          <Button
            variant="gradient"
            className="h-9 px-5"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {addStampMutation.isPending ? t("submitting") : t("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function mapAdjustmentError(
  error: ApiError,
  t: (key: string) => string
): string {
  switch (error.code) {
    case "ADJUSTMENT_NOT_ALLOWED":
      return t("errors.notAllowed");
    case "ADJUSTMENT_REASON_REQUIRED":
      return t("errors.reasonRequired");
    case "LOCATION_NOT_FOUND":
      return t("errors.locationNotFound");
    case "LOCATION_NOT_PERMITTED":
      return t("errors.locationNotPermitted");
    default:
      return error.message;
  }
}
