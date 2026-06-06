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

  const canRedeem = customer.stamps >= maxStamps;

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
      {/* Add Stamp / Redeem */}
      {!canRedeem ? (
        <CustomerActionButton
          variant="stamp"
          size="lg"
          label={t("addStamp")}
          onClick={() => setAdjustOpen(true)}
          disabled={!enrollmentId}
        />
      ) : (
        <CustomerActionButton
          variant="redeem"
          size="lg"
          label={t("redeem")}
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
