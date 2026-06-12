"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRedeemReward } from "@/hooks/use-customers";
import { toast } from "sonner";
import { StampAdjustmentDialog } from "./stamp-adjustment-dialog";
import { StampVoidDialog } from "./stamp-void-dialog";
import { CustomerActionButton } from "./customer-action-button";
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
  const redeemMutation = useRedeemReward(businessId);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  // Redeemable = classic full card OR banked (stacked) rewards. Banked
  // rewards stay redeemable even after stacking is toggled off
  // (keep-and-drain), so `rewards > 0` alone is the right signal.
  const isCardFull = customer.stamps >= maxStamps;
  const hasBankedRewards = (customer.rewards ?? 0) > 0;
  const canRedeem = isCardFull || hasBankedRewards;
  // Stamping stays available below a full card — with stackable rewards a
  // customer can hold banked rewards AND keep stamping, so both buttons
  // show side by side. At a full card stamping is blocked: redeem replaces it.
  const canStamp = !isCardFull;

  const lastVoidable = transactions.find(
    (txn) =>
      (txn.type === "stamp_added" || txn.type === "bonus_stamp") &&
      !transactions.some(
        (v) => v.type === "stamp_voided" && v.voided_transaction_id === txn.id
      )
  );

  // Phase 4: stamp/redeem/void address an enrollment, not a customer. Today
  // every customer has exactly one enrollment per business, so [0] is "the"
  // enrollment. Multi-program pro businesses will pick by program later.
  const enrollmentId = customer.enrollments[0]?.id;

  const handleRedeem = async () => {
    if (!enrollmentId) return;
    try {
      await redeemMutation.mutateAsync({ customerId: customer.id, enrollmentId });
      toast.success(t("redeemSuccessToast"));
      onActionComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("redeemFailedToast"));
    }
  };

  return (
    <div className="flex gap-2">
      {canStamp && (
        <CustomerActionButton
          variant="stamp"
          size="lg"
          label={t("addStamp")}
          onClick={() => setAdjustOpen(true)}
          disabled={!enrollmentId}
        />
      )}

      {canRedeem && (
        <CustomerActionButton
          variant="redeem"
          size="lg"
          label={
            hasBankedRewards && !isCardFull
              ? t("redeemBanked", { count: customer.rewards ?? 0 })
              : t("redeem")
          }
          onClick={handleRedeem}
          loading={redeemMutation.isPending}
        />
      )}

      {/* Void Stamp */}
      <CustomerActionButton
        variant="void"
        size="lg"
        label={t("voidLast")}
        onClick={() => setVoidDialogOpen(true)}
        disabled={!lastVoidable}
      />

      {/* Stamp adjustment dialog (manual stamp from dashboard) */}
      {enrollmentId && (
        <StampAdjustmentDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          businessId={businessId}
          customerId={customer.id}
          customerName={customer.name}
          enrollmentId={enrollmentId}
          onSuccess={onActionComplete}
        />
      )}

      {/* Void dialog */}
      {enrollmentId && lastVoidable && (
        <StampVoidDialog
          open={voidDialogOpen}
          onOpenChange={setVoidDialogOpen}
          businessId={businessId}
          customerId={customer.id}
          customerName={customer.name}
          enrollmentId={enrollmentId}
          transactionId={lastVoidable.id}
          onSuccess={onActionComplete}
        />
      )}
    </div>
  );
}
