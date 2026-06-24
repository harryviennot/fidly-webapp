"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Coins, MapPin, EyeSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface PointsAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  customerId: string;
  customerName: string;
  enrollmentId: string;
  /** Points earned per 1 unit spent, for the live "= +N points" preview. */
  rate: number;
  /** Currency symbol for the amount field. */
  currency: string;
  onSuccess?: () => void;
}

/**
 * Dashboard manual points credit. The owner enters the ticket price; the
 * backend credits round(amount × rate). A reason is required (same as a stamp
 * adjustment) so the manual credit is auditable in the activity log.
 */
export function PointsAddDialog({
  open,
  onOpenChange,
  businessId,
  customerId,
  customerName,
  enrollmentId,
  rate,
  currency,
  onSuccess,
}: PointsAddDialogProps) {
  const t = useTranslations("customers.actions.pointsAdd");
  const tShared = useTranslations("customers.actions");
  const { hasFeature } = useEntitlements();
  const addStampMutation = useAddStamp(businessId);

  const showLocationPicker = hasFeature("locations.multiple");
  const { data: locations } = useLocations(showLocationPicker ? businessId : undefined);
  const activeLocations = (locations ?? []).filter((l) => !l.deleted_at);
  const hasLocations = activeLocations.length > 0;

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [locationValue, setLocationValue] = useState<string>(NO_LOCATION);

  const resetState = () => {
    setAmount("");
    setReason("");
    setLocationValue(NO_LOCATION);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetState();
    onOpenChange(next);
  };

  const amountNum = parseFloat(amount);
  const amountValid = !Number.isNaN(amountNum) && amountNum > 0;
  const pointsPreview = amountValid ? Math.round(amountNum * rate) : 0;
  const reasonTrimmed = reason.trim();
  const canSubmit =
    amountValid && reasonTrimmed.length > 0 && !addStampMutation.isPending;

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
        amount: amountNum,
        reason: reasonTrimmed,
        locationId,
      });
      toast.success(t("successToast", { points: pointsPreview }));
      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.code === "AMOUNT_REQUIRED"
            ? t("errors.amountRequired")
            : error.message
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
            <Coins className="w-5 h-5" weight="duotone" style={{ color: "var(--accent)" }} />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-[17px] leading-tight">{t("title")}</DialogTitle>
            <DialogDescription className="text-[13px] mt-0.5 truncate">
              {customerName}
            </DialogDescription>
          </div>
        </div>

        {/* Ticket amount */}
        <div className="flex flex-col gap-2">
          <label htmlFor="points-amount" className="text-[13px] font-medium text-[var(--foreground)]">
            {t("amountLabel")}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-[#9A9A9A]">
              {currency}
            </span>
            <Input
              id="points-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="h-11 pl-8"
            />
          </div>
          {amountValid && (
            <p className="text-[12px] font-semibold text-[var(--accent)]">
              {t("preview", { points: pointsPreview })}
            </p>
          )}
        </div>

        {/* Reason */}
        <div className="flex flex-col gap-2">
          <label htmlFor="points-reason" className="text-[13px] font-medium text-[var(--foreground)]">
            {t("reasonLabel")}
          </label>
          <Textarea
            id="points-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reasonPlaceholder")}
            maxLength={REASON_MAX}
            rows={2}
            className="resize-none focus-visible:ring-[var(--accent)]/30 focus-visible:border-[var(--accent)]"
          />
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] mt-0.5">
            <EyeSlash className="w-3 h-3 shrink-0" weight="bold" />
            {t("reasonHelp")}
          </p>
        </div>

        {showLocationPicker && hasLocations && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="points-location"
              className="text-[13px] font-medium text-[var(--foreground)] flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              {t("locationLabel")}
            </label>
            <Select value={locationValue} onValueChange={setLocationValue}>
              <SelectTrigger id="points-location" className="h-9 text-[13px]">
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
