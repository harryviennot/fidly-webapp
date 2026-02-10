"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { StampIcon, GiftIcon, ProhibitIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [showVoidForm, setShowVoidForm] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  const canRedeem = customer.stamps >= maxStamps;

  // Find the most recent voidable transaction
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
      setShowVoidForm(false);
      setVoidReason("");
      onActionComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("voidFailedToast"));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          variant="gradient"
          size="sm"
          className="flex-1"
          onClick={handleAddStamp}
          disabled={addStampMutation.isPending}
        >
          <StampIcon className="mr-1.5 h-4 w-4" />
          {t("addStamp")}
        </Button>

        <Button
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          onClick={handleRedeem}
          disabled={redeemMutation.isPending || !canRedeem}
        >
          <GiftIcon className="mr-1.5 h-4 w-4" />
          {t("redeem")}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => setShowVoidForm(!showVoidForm)}
          disabled={!lastVoidable}
        >
          <ProhibitIcon className="mr-1.5 h-4 w-4" />
          {t("voidLast")}
        </Button>
      </div>

      {showVoidForm && lastVoidable && (
        <div className="flex gap-2">
          <Input
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder={t("voidReasonPlaceholder")}
            className="flex-1 text-sm"
            maxLength={500}
          />
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleVoid}
            disabled={voidMutation.isPending || !voidReason.trim()}
          >
            {voidMutation.isPending ? t("voiding") : t("confirmVoid")}
          </Button>
        </div>
      )}
    </div>
  );
}
