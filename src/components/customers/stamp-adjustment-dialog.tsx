"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Stamp, MapPin } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#E8F5E4] text-[#4A7C59]">
              <Stamp className="w-4 h-4" weight="bold" />
            </span>
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { name: customerName })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Reason — required */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label
                htmlFor="adjustment-reason"
                className="text-sm font-medium text-[var(--foreground)]"
              >
                {t("reasonLabel")}
              </label>
              <span className="text-[11px] text-[#A0A0A0] tabular-nums">
                {reasonTrimmed.length}/{REASON_MAX}
              </span>
            </div>
            <Textarea
              id="adjustment-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              maxLength={REASON_MAX}
              rows={3}
              autoFocus
            />
            <p className="text-[11px] text-[#A0A0A0] mt-1">
              {t("reasonHelp")}
            </p>
          </div>

          {/* Location picker — only Pro + has-locations */}
          {showLocationPicker && hasLocations && (
            <div>
              <label
                htmlFor="adjustment-location"
                className="text-sm font-medium text-[var(--foreground)] mb-1.5 flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5 text-[#B0B0B0]" />
                {t("locationLabel")}
              </label>
              <Select value={locationValue} onValueChange={setLocationValue}>
                <SelectTrigger id="adjustment-location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LOCATION}>
                    <span className="text-[#666]">{t("noLocation")}</span>
                  </SelectItem>
                  {activeLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      <span className="flex items-center gap-1.5">
                        {loc.name}
                        {loc.is_primary && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#4A7C59]">
                            {t("primary")}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-[#A0A0A0] mt-1">
                {t("locationHelp")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => handleOpenChange(false)}
            disabled={addStampMutation.isPending}
          >
            {tShared("cancel")}
          </Button>
          <Button
            variant="outline"
            className="rounded-lg text-[#4A7C59] border-[#C8E6C4] hover:bg-[#E8F5E4]"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {addStampMutation.isPending ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
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
