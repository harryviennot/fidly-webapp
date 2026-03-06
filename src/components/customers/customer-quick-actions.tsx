"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Stamp, Gift, Prohibit } from "@phosphor-icons/react";
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
    (txn) =>
      (txn.type === "stamp_added" || txn.type === "bonus_stamp") &&
      !transactions.some(
        (v) => v.type === "stamp_voided" && v.voided_transaction_id === txn.id
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
    <div className="flex gap-1.5">
      {/* Add Stamp / Redeem */}
      {!canRedeem ? (
        <ActionButton
          icon={<Stamp className="w-4 h-4" />}
          label={t("addStamp")}
          color="#4A7C59"
          bg="#E8F5E4"
          border="#C8E6C4"
          onClick={handleAddStamp}
          disabled={addStampMutation.isPending}
        />
      ) : (
        <ActionButton
          icon={<Gift className="w-4 h-4" />}
          label={t("redeem")}
          color="#C4883D"
          bg="#FFF3E0"
          border="#F0DFC0"
          onClick={handleRedeem}
          disabled={redeemMutation.isPending}
        />
      )}

      {/* Void Stamp */}
      <ActionButton
        icon={<Prohibit className="w-4 h-4" />}
        label={t("voidLast")}
        color="#C75050"
        bg="#fff"
        border="#DEDBD5"
        onClick={() => setVoidDialogOpen(true)}
        disabled={!lastVoidable}
      />

      {/* Void dialog */}
      <Dialog
        open={voidDialogOpen}
        onOpenChange={(open) => {
          setVoidDialogOpen(open);
          if (!open) setVoidReason("");
        }}
      >
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
              className="rounded-lg text-[#C75050] border-[#FDE8E4] hover:bg-[#FDE8E4]"
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

function ActionButton({
  icon,
  label,
  color,
  bg,
  border,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
  border: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-lg cursor-pointer transition-all duration-150 hover:-translate-y-px hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
      style={{
        border: `1px solid ${border}`,
        background: bg,
        fontFamily: "inherit",
      }}
    >
      <span style={{ color }} className="flex">
        {icon}
      </span>
      <span
        className="text-[10px] font-medium whitespace-nowrap"
        style={{ color }}
      >
        {label}
      </span>
    </button>
  );
}
