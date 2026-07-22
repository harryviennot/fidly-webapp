"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Gift, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRedeemReward } from "@/hooks/use-customers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ProgramSnapshot } from "@/types";

interface PointsRedeemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  customerId: string;
  customerName: string;
  enrollmentId: string;
  snapshot: ProgramSnapshot;
  onSuccess?: () => void;
}

/**
 * Reward picker for redeeming against a points balance. Lists the reward menu;
 * rewards the balance can't afford are disabled. Spends down on the backend
 * (balance drops by the reward's price, keeping the change).
 */
export function PointsRedeemDialog({
  open,
  onOpenChange,
  businessId,
  customerId,
  customerName,
  enrollmentId,
  snapshot,
  onSuccess,
}: PointsRedeemDialogProps) {
  const t = useTranslations("customers.actions.pointsRedeem");
  const tShared = useTranslations("customers.actions");
  const redeemMutation = useRedeemReward(businessId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rewards = snapshot.rewards ?? [];
  const selected = rewards.find((r) => r.id === selectedId) ?? null;
  const canSubmit = selected?.reached === true && !redeemMutation.isPending;

  const handleSubmit = async () => {
    if (!selected || !canSubmit) return;
    try {
      await redeemMutation.mutateAsync({ customerId, enrollmentId, rewardId: selected.id });
      toast.success(t("successToast", { reward: selected.name }));
      onOpenChange(false);
      setSelectedId(null);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failedToast"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5" weight="duotone" style={{ color: "var(--accent)" }} />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-[17px] leading-tight">{t("title")}</DialogTitle>
            <DialogDescription className="text-[13px] mt-0.5 truncate">
              {t("balance", { balance: snapshot.display })} · {customerName}
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
          {rewards.map((reward) => {
            const affordable = reward.reached;
            const isSelected = selectedId === reward.id;
            return (
              <button
                key={reward.id}
                type="button"
                disabled={!affordable}
                onClick={() => setSelectedId(reward.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                  !affordable && "opacity-50 cursor-not-allowed",
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent-light)]"
                    : "border-[var(--border)] bg-white hover:border-[var(--accent)]"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-[#1A1A1A] truncate">
                    {reward.name}
                  </div>
                  <div className="text-[12px] text-[#8A8A8A]">
                    {t("price", { points: reward.threshold })}
                    {!affordable && ` · ${t("notEnough")}`}
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle className="w-5 h-5 text-[var(--accent)] shrink-0" weight="fill" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            className="rounded-full h-9 px-4 text-[var(--muted-gray)]"
            onClick={() => onOpenChange(false)}
            disabled={redeemMutation.isPending}
          >
            {tShared("cancel")}
          </Button>
          <Button
            variant="gradient"
            className="h-9 px-5"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {redeemMutation.isPending ? t("submitting") : t("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
