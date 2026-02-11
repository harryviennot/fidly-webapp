"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { StampIcon, GiftIcon, ProhibitIcon } from "@phosphor-icons/react";
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
import { useAddStamp, useRedeemReward, useVoidStamp } from "@/hooks/use-customers";
import { toast } from "sonner";
import type { CustomerResponse, TransactionResponse } from "@/types";

interface CustomerQuickActionsProps {
  customer: CustomerResponse;
  businessId: string;
  maxStamps: number;
  transactions: TransactionResponse[];
  onActionComplete: () => void;
}

export function CustomerQuickActions({
  customer,
  businessId,
  maxStamps,
  transactions,
  onActionComplete,
}: CustomerQuickActionsProps) {
  const t = useTranslations("customers.actions");
  const addStampMutation = useAddStamp(businessId);
  const redeemMutation = useRedeemReward(businessId);
  const voidMutation = useVoidStamp(businessId);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  const canRedeem = customer.stamps >= maxStamps;

  const lastVoidable = transactions.find(
    (t) =>
      (t.type === "stamp_added" || t.type === "bonus_stamp") &&
      !transactions.some(
        (v) => v.type === "stamp_voided" && v.voided_transaction_id === t.id
      )
  );

  const handleAddStamp = async () => {
    try {
      await addStampMutation.mutateAsync(customer.id);
      toast.success(t("stampAddedToast"));
      onActionComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("stampFailedToast"));
    }
  };

  const handleRedeem = async () => {
    try {
      await redeemMutation.mutateAsync(customer.id);
      toast.success(t("redeemSuccessToast"));
      onActionComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("redeemFailedToast"));
    }
  };

  const handleVoid = async () => {
    if (!lastVoidable || !voidReason.trim()) return;
    try {
      await voidMutation.mutateAsync({
        customerId: customer.id,
        transactionId: lastVoidable.id,
        reason: voidReason.trim(),
      });
      toast.success(t("voidSuccessToast"));
      setVoidDialogOpen(false);
      setVoidReason("");
      onActionComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("voidFailedToast"));
    }
  };

  return (
    <div className="space-y-3">
      {/* Primary action — full width */}
      <Button
        variant="gradient"
        size="sm"
        className="w-full rounded-full"
        onClick={handleAddStamp}
        disabled={addStampMutation.isPending}
      >
        <StampIcon className="mr-1.5 h-4 w-4" />
        {t("addStamp")}
      </Button>

      {/* Secondary actions — side by side, muted */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800"
          onClick={handleRedeem}
          disabled={redeemMutation.isPending || !canRedeem}
        >
          <GiftIcon className="mr-1.5 h-4 w-4" />
          {t("redeem")}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-full text-[var(--muted-foreground)] hover:text-red-600 hover:border-red-200 hover:bg-red-50"
          onClick={() => setVoidDialogOpen(true)}
          disabled={!lastVoidable}
        >
          <ProhibitIcon className="mr-1.5 h-4 w-4" />
          {t("voidLast")}
        </Button>
      </div>

      <Dialog open={voidDialogOpen} onOpenChange={(open) => {
        setVoidDialogOpen(open);
        if (!open) setVoidReason("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("voidDialogTitle")}</DialogTitle>
            <DialogDescription>{t("voidDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-[var(--foreground)] mb-1.5 block">
              {t("voidReasonLabel")}
            </label>
            <Textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder={t("voidReasonPlaceholder")}
              maxLength={500}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setVoidDialogOpen(false);
                setVoidReason("");
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="outline"
              className="rounded-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleVoid}
              disabled={voidMutation.isPending || !voidReason.trim()}
            >
              {voidMutation.isPending ? t("voiding") : t("confirmVoid")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
