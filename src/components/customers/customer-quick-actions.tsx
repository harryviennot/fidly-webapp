"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { StampIcon, GiftIcon, ProhibitIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addStamp, redeemReward, voidStamp } from "@/api";
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
  const [stampLoading, setStampLoading] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [voidLoading, setVoidLoading] = useState(false);
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
    setStampLoading(true);
    try {
      await addStamp(businessId, customer.id);
      toast.success(t("stampAddedToast"));
      onActionComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("stampFailedToast"));
    } finally {
      setStampLoading(false);
    }
  };

  const handleRedeem = async () => {
    setRedeemLoading(true);
    try {
      await redeemReward(businessId, customer.id);
      toast.success(t("redeemSuccessToast"));
      onActionComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("redeemFailedToast"));
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!lastVoidable || !voidReason.trim()) return;
    setVoidLoading(true);
    try {
      await voidStamp(businessId, customer.id, lastVoidable.id, voidReason.trim());
      toast.success(t("voidSuccessToast"));
      setShowVoidForm(false);
      setVoidReason("");
      onActionComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("voidFailedToast"));
    } finally {
      setVoidLoading(false);
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
          disabled={stampLoading}
        >
          <StampIcon className="mr-1.5 h-4 w-4" />
          {t("addStamp")}
        </Button>

        <Button
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          onClick={handleRedeem}
          disabled={redeemLoading || !canRedeem}
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
            disabled={voidLoading || !voidReason.trim()}
          >
            {voidLoading ? t("voiding") : t("confirmVoid")}
          </Button>
        </div>
      )}
    </div>
  );
}
