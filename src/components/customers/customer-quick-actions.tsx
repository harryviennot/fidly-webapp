"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Stamp, Gift, Prohibit } from "@phosphor-icons/react";
import { useRedeemReward } from "@/hooks/use-customers";
import { toast } from "sonner";
import { StampAdjustmentDialog } from "./stamp-adjustment-dialog";
import { StampVoidDialog } from "./stamp-void-dialog";
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
    <div className="flex gap-1.5">
      {/* Add Stamp / Redeem */}
      {!canRedeem ? (
        <ActionButton
          icon={<Stamp className="w-4 h-4" />}
          label={t("addStamp")}
          color="#4A7C59"
          bg="#E8F5E4"
          border="#C8E6C4"
          onClick={() => setAdjustOpen(true)}
          disabled={!enrollmentId}
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
