"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRedeemReward } from "@/hooks/use-customers";
import { useBusiness } from "@/contexts/business-context";
import { toast } from "sonner";
import { StampAdjustmentDialog } from "./stamp-adjustment-dialog";
import { StampVoidDialog } from "./stamp-void-dialog";
import { PointsAddDialog } from "./points-add-dialog";
import { PointsAdjustDialog } from "./points-adjust-dialog";
import { PointsRedeemDialog } from "./points-redeem-dialog";
import { CustomerActionButton } from "./customer-action-button";
import { txDelta } from "@/lib/transaction-constants";
import type { CustomerResponse, ProgramSnapshot, TransactionResponse } from "@/types";

interface CustomerQuickActionsProps {
  customer: CustomerResponse;
  businessId: string;
  maxStamps: number;
  transactions: TransactionResponse[];
  onActionComplete: () => void;
  /** Points snapshot (detail endpoint). Present → renders the points actions. */
  snapshot?: ProgramSnapshot | null;
  /** Currency symbol for the points add dialog. */
  currency?: string;
}

export function CustomerQuickActions({
  customer,
  businessId,
  maxStamps,
  transactions,
  onActionComplete,
  snapshot,
  currency = "€",
}: CustomerQuickActionsProps) {
  const t = useTranslations("customers.actions");
  const { currentRole } = useBusiness();
  const redeemMutation = useRedeemReward(businessId);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [pointsAddOpen, setPointsAddOpen] = useState(false);
  const [pointsRedeemOpen, setPointsRedeemOpen] = useState(false);

  // Manual signed adjustments are owner/admin-only (the backend 403s scanners).
  const isManager = currentRole === "owner" || currentRole === "admin";
  const isPoints = snapshot?.type === "points";
  // Phase 4: stamp/redeem/void address an enrollment, not a customer. Today
  // every customer has exactly one enrollment per business, so [0] is "the"
  // enrollment. Multi-program pro businesses will pick by program later.
  const enrollmentId = customer.enrollments[0]?.id;

  if (isPoints && snapshot) {
    const canRedeemPoints = (snapshot.rewards ?? []).some((r) => r.reached);
    // Last points credit not already reversed — the void target. Mirrors the
    // stamp voidable logic but for points_earned / bonus_points.
    const lastVoidablePoints = transactions.find(
      (txn) =>
        (txn.type === "points_earned" || txn.type === "bonus_points") &&
        !transactions.some(
          (v) => v.type === "points_voided" && v.voided_transaction_id === txn.id
        )
    );
    // The remove button is usable when there's a last credit to void (any
    // role) OR the user is an owner/admin who can remove a custom amount.
    const canRemovePoints = !!lastVoidablePoints || isManager;
    return (
      <>
        <div className="flex gap-2">
          <CustomerActionButton
            variant="stamp"
            size="lg"
            label={t("addPoints")}
            onClick={() => setPointsAddOpen(true)}
            disabled={!enrollmentId}
          />
          {canRedeemPoints && (
            <CustomerActionButton
              variant="redeem"
              size="lg"
              label={t("redeem")}
              onClick={() => setPointsRedeemOpen(true)}
            />
          )}
          {/* Remove points: void the last credit, or (owner/admin) a custom amount. */}
          <CustomerActionButton
            variant="void"
            size="lg"
            label={t("removePoints")}
            onClick={() => setVoidDialogOpen(true)}
            disabled={!enrollmentId || !canRemovePoints}
          />
        </div>

        {enrollmentId && canRemovePoints && (
          <PointsAdjustDialog
            open={voidDialogOpen}
            onOpenChange={setVoidDialogOpen}
            businessId={businessId}
            customerId={customer.id}
            customerName={customer.name}
            enrollmentId={enrollmentId}
            currentBalance={snapshot.primary_value}
            lastCredit={
              lastVoidablePoints
                ? { transactionId: lastVoidablePoints.id, amount: txDelta(lastVoidablePoints) }
                : undefined
            }
            canCustom={isManager}
            onSuccess={onActionComplete}
          />
        )}

        {enrollmentId && (
          <PointsAddDialog
            open={pointsAddOpen}
            onOpenChange={setPointsAddOpen}
            businessId={businessId}
            customerId={customer.id}
            customerName={customer.name}
            enrollmentId={enrollmentId}
            rate={snapshot.points_per_currency_unit ?? 1}
            currency={currency}
            onSuccess={onActionComplete}
          />
        )}
        {enrollmentId && (
          <PointsRedeemDialog
            open={pointsRedeemOpen}
            onOpenChange={setPointsRedeemOpen}
            businessId={businessId}
            customerId={customer.id}
            customerName={customer.name}
            enrollmentId={enrollmentId}
            snapshot={snapshot}
            onSuccess={onActionComplete}
          />
        )}
      </>
    );
  }

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

  // When stamp + redeem + void all show at once (banked rewards on a not-yet-full
  // card), three lg buttons with their labels overflow the narrow detail sheet.
  const allActions = canStamp && canRedeem;

  const stampButton = canStamp ? (
    <CustomerActionButton
      variant="stamp"
      size="lg"
      label={t("addStamp")}
      onClick={() => setAdjustOpen(true)}
      disabled={!enrollmentId}
    />
  ) : null;

  const redeemButton = canRedeem ? (
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
      // In the stacked layout the button is a flex-col child; its baked-in
      // flex-1 would collapse the height, so reset to flex-none + full width.
      className={allActions ? "w-full flex-none" : undefined}
    />
  ) : null;

  const voidButton = (
    <CustomerActionButton
      variant="void"
      size="lg"
      label={t("voidLast")}
      onClick={() => setVoidDialogOpen(true)}
      disabled={!lastVoidable}
    />
  );

  return (
    <>
      {allActions ? (
        // Split: stamp + void share the top row, redeem takes its own full-width
        // row below so nothing overflows the sheet width.
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {stampButton}
            {voidButton}
          </div>
          {redeemButton}
        </div>
      ) : (
        <div className="flex gap-2">
          {stampButton}
          {redeemButton}
          {voidButton}
        </div>
      )}

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
          voidValue={txDelta(lastVoidable)}
          onSuccess={onActionComplete}
        />
      )}
    </>
  );
}
