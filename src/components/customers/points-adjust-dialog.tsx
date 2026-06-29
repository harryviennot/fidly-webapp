"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Prohibit, EyeSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVoidStamp, useAdjustPoints } from "@/hooks/use-customers";
import { ApiError } from "@/api/client";
import { toast } from "sonner";

const REASON_MAX = 280;
type Mode = "last" | "custom";

interface PointsRemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  customerId: string;
  customerName: string;
  enrollmentId: string;
  /** Current spendable balance, for the "new balance" preview. */
  currentBalance: number;
  /** The last reversible credit, if any — the "void last" option. */
  lastCredit?: { transactionId: string; amount: number };
  /** Owner/admin may remove a custom amount (POST /adjust is management-only). */
  canCustom: boolean;
  onSuccess?: () => void;
}

/**
 * Remove points from a balance: either VOID the last credit (a true
 * per-transaction reversal, available to any team member) or — for owners/
 * admins — remove a CUSTOM amount via /adjust. One dialog, two paths; the
 * resulting balance is shown before confirming.
 */
export function PointsAdjustDialog({
  open,
  onOpenChange,
  businessId,
  customerId,
  customerName,
  enrollmentId,
  currentBalance,
  lastCredit,
  canCustom,
  onSuccess,
}: PointsRemoveDialogProps) {
  const t = useTranslations("customers.actions.pointsRemove");
  const tShared = useTranslations("customers.actions");
  const voidMutation = useVoidStamp(businessId);
  const adjustMutation = useAdjustPoints(businessId);

  const hasLast = !!lastCredit && lastCredit.amount > 0;
  const showToggle = hasLast && canCustom;

  const [mode, setMode] = useState<Mode>(hasLast ? "last" : "custom");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const reasonChips = [tShared("voidChip1"), tShared("voidChip2"), tShared("voidChip3")];

  const resetState = () => {
    setMode(hasLast ? "last" : "custom");
    setAmount("");
    setReason("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetState();
    onOpenChange(next);
  };

  const customNum = parseInt(amount, 10);
  const customValid = !Number.isNaN(customNum) && customNum > 0;
  const removeAmount = mode === "last" ? lastCredit?.amount ?? 0 : customValid ? customNum : 0;
  const newBalance = Math.max(0, currentBalance - removeAmount);
  const reasonTrimmed = reason.trim();
  const pending = voidMutation.isPending || adjustMutation.isPending;
  const canSubmit =
    reasonTrimmed.length > 0 &&
    removeAmount > 0 &&
    (mode === "last" ? hasLast : customValid) &&
    !pending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      if (mode === "last" && lastCredit) {
        await voidMutation.mutateAsync({
          customerId,
          enrollmentId,
          transactionId: lastCredit.transactionId,
          reason: reasonTrimmed,
        });
      } else {
        await adjustMutation.mutateAsync({
          customerId,
          enrollmentId,
          amount: -customNum,
          reason: reasonTrimmed,
        });
      }
      toast.success(t("successToast", { points: removeAmount }));
      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : tShared("voidFailedToast");
      toast.error(message);
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
            <DialogTitle className="text-[17px] leading-tight">{t("title")}</DialogTitle>
            <DialogDescription className="text-[13px] mt-0.5 truncate">
              {customerName}
            </DialogDescription>
          </div>
        </div>

        {/* Last credit vs custom amount (managers only get the choice). */}
        {showToggle && (
          <div className="inline-flex w-full rounded-xl border border-[var(--border)] bg-[var(--paper)] p-0.5">
            {(["last", "custom"] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={active}
                  className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                    active
                      ? "bg-white shadow-sm text-[var(--foreground)]"
                      : "text-[var(--muted-gray)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {t(m === "last" ? "modeLast" : "modeCustom")}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom amount input (custom mode only) */}
        {mode === "custom" && (
          <div className="flex flex-col gap-2">
            <label htmlFor="remove-amount" className="text-[13px] font-medium text-[var(--foreground)]">
              {t("amountLabel")}
            </label>
            <Input
              id="remove-amount"
              type="number"
              inputMode="numeric"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
              className="h-11"
            />
          </div>
        )}

        {/* Resulting balance */}
        {removeAmount > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-[#FDF1EF] border border-[#F3D9D4] px-3.5 py-2.5">
            <span className="text-[13px] text-[#9A4B43]">{t("newBalanceLabel")}</span>
            <span className="text-[15px] font-bold tabular-nums text-[#C75050]">
              {t("pointsValue", { points: newBalance })}
            </span>
          </div>
        )}

        {/* Reason */}
        <div className="flex flex-col gap-2">
          <label htmlFor="remove-reason" className="text-[13px] font-medium text-[var(--foreground)]">
            {tShared("voidReasonLabel")}
          </label>
          <Textarea
            id="remove-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={tShared("voidReasonPlaceholder")}
            maxLength={REASON_MAX}
            rows={2}
            className="resize-none focus-visible:ring-[var(--error)]/30 focus-visible:border-[var(--error)]"
          />
          <div className="flex flex-wrap gap-1.5">
            {reasonChips.map((c) => {
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
            {tShared("voidReasonHelp")}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            className="rounded-full h-9 px-4 text-[var(--muted-gray)]"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            {tShared("cancel")}
          </Button>
          <Button
            className="h-9 px-5 rounded-full bg-[var(--error)] text-white font-semibold transition-all hover:bg-[#B04545] hover:scale-[1.02] disabled:hover:scale-100"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {pending ? t("submitting") : t("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
