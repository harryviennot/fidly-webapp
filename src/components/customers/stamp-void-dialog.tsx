"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Prohibit, EyeSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVoidStamp } from "@/hooks/use-customers";
import { toast } from "sonner";

const REASON_MAX = 280;

interface StampVoidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  customerId: string;
  customerName: string;
  enrollmentId: string;
  transactionId: string;
  /** Fired after a successful void — caller invalidates anything extra. */
  onSuccess?: () => void;
}

export function StampVoidDialog({
  open,
  onOpenChange,
  businessId,
  customerId,
  customerName,
  enrollmentId,
  transactionId,
  onSuccess,
}: StampVoidDialogProps) {
  const t = useTranslations("customers.actions");
  const voidMutation = useVoidStamp(businessId);

  const [reason, setReason] = useState("");

  const chips = [t("voidChip1"), t("voidChip2"), t("voidChip3")];

  const resetState = () => setReason("");

  const handleOpenChange = (next: boolean) => {
    if (!next) resetState();
    onOpenChange(next);
  };

  const reasonTrimmed = reason.trim();
  const canSubmit = reasonTrimmed.length > 0 && !voidMutation.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await voidMutation.mutateAsync({
        customerId,
        enrollmentId,
        transactionId,
        reason: reasonTrimmed,
      });
      toast.success(t("voidSuccessToast"));
      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("voidFailedToast"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[400px] gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--error-light)] flex items-center justify-center shrink-0">
            <Prohibit className="w-5 h-5" weight="duotone" style={{ color: "var(--error)" }} />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-[17px] leading-tight">{t("voidDialogTitle")}</DialogTitle>
            <DialogDescription className="text-[13px] mt-0.5 truncate">
              {customerName}
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="void-reason"
            className="text-[13px] font-medium text-[var(--foreground)]"
          >
            {t("voidReasonLabel")}
          </label>
          <Textarea
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("voidReasonPlaceholder")}
            maxLength={REASON_MAX}
            rows={3}
            autoFocus
            className="resize-none focus-visible:ring-[var(--error)]/30 focus-visible:border-[var(--error)]"
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
                      ? "bg-[var(--error-light)] border-[var(--error)] text-[var(--error)]"
                      : "bg-white border-[var(--border)] text-[var(--muted-gray)] hover:border-[var(--error)] hover:text-[var(--error)]"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] mt-0.5">
            <EyeSlash className="w-3 h-3 shrink-0" weight="bold" />
            {t("voidReasonHelp")}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            className="rounded-full h-9 px-4 text-[var(--muted-gray)]"
            onClick={() => handleOpenChange(false)}
            disabled={voidMutation.isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            className="h-9 px-5 rounded-full bg-[var(--error)] text-white font-semibold transition-all hover:bg-[#B04545] hover:scale-[1.02] hover:shadow-lg hover:shadow-[var(--error)]/25 focus-visible:ring-2 focus-visible:ring-[var(--error)] focus-visible:ring-offset-2 disabled:hover:scale-100"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {voidMutation.isPending ? t("voiding") : t("confirmVoid")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
