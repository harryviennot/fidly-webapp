"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateCustomer } from "@/hooks/use-customers";
import { toast } from "sonner";

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  currentName: string;
  currentEmail?: string | null;
  currentPhone?: string | null;
  businessId: string;
  onSuccess?: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loose client check — the backend does the authoritative E.164 validation and
// returns a clear error we surface on failure.
const PHONE_RE = /^\+?[\d\s().-]{6,20}$/;

function isPlaceholder(email?: string | null): boolean {
  return !email || email.endsWith("@placeholder.local");
}

export function EditCustomerDialog({
  open,
  onOpenChange,
  customerId,
  currentName,
  currentEmail,
  currentPhone,
  businessId,
  onSuccess,
}: EditCustomerDialogProps) {
  const t = useTranslations("customers.editInfo");
  const updateMutation = useUpdateCustomer(businessId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Prefill from the stored values each time the dialog opens. Adjusting state
  // during the open transition (rather than in an effect) avoids a render
  // cascade — same pattern as SendPassDialog.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(currentName ?? "");
      setEmail(isPlaceholder(currentEmail) ? "" : currentEmail ?? "");
      setPhone(currentPhone ?? "");
    }
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();

  const emailValid = trimmedEmail === "" || EMAIL_RE.test(trimmedEmail);
  const phoneValid = trimmedPhone === "" || PHONE_RE.test(trimmedPhone);
  const nameValid = trimmedName.length > 0;

  // Normalize stored values for change detection (placeholder email reads empty).
  const storedEmail = isPlaceholder(currentEmail) ? "" : currentEmail ?? "";
  const storedPhone = currentPhone ?? "";
  const dirty =
    trimmedName !== (currentName ?? "").trim() ||
    trimmedEmail !== storedEmail.trim() ||
    trimmedPhone !== storedPhone.trim();

  const canSubmit =
    nameValid && emailValid && phoneValid && dirty && !updateMutation.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // Send only the fields that actually changed; empty string clears a field.
    const input: { name?: string; email?: string; phone?: string } = {};
    if (trimmedName !== (currentName ?? "").trim()) input.name = trimmedName;
    if (trimmedEmail !== storedEmail.trim()) input.email = trimmedEmail;
    if (trimmedPhone !== storedPhone.trim()) input.phone = trimmedPhone;

    try {
      await updateMutation.mutateAsync({ customerId, input });
      toast.success(t("successToast"));
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failedToast"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center shrink-0">
            <PencilSimple
              className="w-5 h-5"
              weight="duotone"
              style={{ color: "var(--accent)" }}
            />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-[17px] leading-tight">
              {t("dialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-[13px] mt-0.5 leading-snug break-words">
              {t("dialogDescription")}
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Field
            id="edit-customer-name"
            label={t("nameLabel")}
            value={name}
            onChange={setName}
            placeholder={t("namePlaceholder")}
            autoComplete="name"
            autoFocus
            error={!nameValid ? t("nameRequired") : undefined}
          />
          <Field
            id="edit-customer-email"
            label={t("emailLabel")}
            optionalLabel={t("optional")}
            value={email}
            onChange={setEmail}
            placeholder={t("emailPlaceholder")}
            type="email"
            inputMode="email"
            autoComplete="email"
            error={!emailValid ? t("emailInvalid") : undefined}
          />
          <Field
            id="edit-customer-phone"
            label={t("phoneLabel")}
            optionalLabel={t("optional")}
            value={phone}
            onChange={setPhone}
            placeholder={t("phonePlaceholder")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            error={!phoneValid ? t("phoneInvalid") : undefined}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            className="rounded-full h-9 px-4 text-[var(--muted-gray)]"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="gradient"
            className="h-9 px-5 rounded-full font-semibold"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {updateMutation.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  optionalLabel,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  inputMode,
  autoComplete,
  autoFocus,
}: {
  id: string;
  label: string;
  optionalLabel?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  inputMode?: "email" | "tel" | "text";
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[13px] font-medium text-[var(--foreground)]"
      >
        {label}
        {optionalLabel && (
          <span className="ml-1.5 font-normal text-[var(--muted-foreground)]">
            {optionalLabel}
          </span>
        )}
      </label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {error && <p className="text-[12px] text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
