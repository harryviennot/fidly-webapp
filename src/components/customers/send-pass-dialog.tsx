"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PaperPlaneTilt, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSendCustomerPass } from "@/hooks/use-customers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SendPassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  /** The customer's stored email; may be empty/null when none was collected. */
  currentEmail?: string | null;
  businessId: string;
  onSuccess?: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPlaceholder(email?: string | null): boolean {
  return !email || email.endsWith("@placeholder.local");
}

export function SendPassDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  currentEmail,
  businessId,
  onSuccess,
}: SendPassDialogProps) {
  const t = useTranslations("customers.sendPass");
  const sendMutation = useSendCustomerPass(businessId);

  const [email, setEmail] = useState("");

  // Prefill with the stored email each time the dialog opens, unless it's a
  // placeholder (no real address) — then start empty so the user must type one.
  // Adjusting state during render (on the open transition) avoids a setState
  // effect that would cascade renders.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setEmail(isPlaceholder(currentEmail) ? "" : currentEmail ?? "");
  }

  const trimmed = email.trim();
  const valid = EMAIL_RE.test(trimmed);
  const canSubmit = valid && !sendMutation.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await sendMutation.mutateAsync({ customerId, email: trimmed });
      toast.success(t("successToast"));
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failedToast"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[420px] gap-5",
          // Phones: dock to the bottom edge as a sheet instead of a centered
          // modal. It sizes to its content, rides up with the keyboard, and
          // reads as native mobile UI — no overflow, no forced scrolling.
          "max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:right-0",
          "max-md:translate-x-0 max-md:translate-y-0 max-md:w-full max-md:max-w-none",
          "max-md:rounded-b-none max-md:rounded-t-3xl max-md:p-6",
          "max-md:pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          // Mobile safety net only (desktop matches the sibling dialogs exactly):
          // this form is short enough that the scroll never actually triggers.
          "max-md:max-h-[92dvh] max-md:overflow-y-auto max-md:overscroll-contain"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center shrink-0">
            <PaperPlaneTilt
              className="w-5 h-5"
              weight="duotone"
              style={{ color: "var(--accent)" }}
            />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-[17px] leading-tight">
              {t("dialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-[13px] mt-0.5 truncate">
              {t("dialogDescription", { name: customerName })}
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="send-pass-email"
            className="text-[13px] font-medium text-[var(--foreground)]"
          >
            {t("emailLabel")}
          </label>
          <Input
            id="send-pass-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            autoFocus={isPlaceholder(currentEmail)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) handleSubmit();
            }}
          />

          {/* Ownership warning — sending the card hands over full access. */}
          <div className="flex gap-2.5 mt-1 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-light)] px-3 py-2.5">
            <Warning
              className="w-4 h-4 shrink-0 mt-0.5"
              weight="fill"
              style={{ color: "var(--warning)" }}
            />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--foreground)]">
                {t("warningTitle")}
              </p>
              <p className="text-[12px] leading-snug text-[var(--muted-foreground)] mt-0.5">
                {t("warningBody")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            className="rounded-full h-9 px-4 text-[var(--muted-gray)]"
            onClick={() => onOpenChange(false)}
            disabled={sendMutation.isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="gradient"
            className="h-9 px-5 rounded-full font-semibold"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {sendMutation.isPending ? t("sending") : t("send")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
