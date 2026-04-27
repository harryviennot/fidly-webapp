"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-provider";

interface InviteForgotPasswordProps {
  email: string;
  businessName: string;
  onCancel: () => void;
}

export function InviteForgotPassword({
  email,
  businessName,
  onCancel,
}: InviteForgotPasswordProps) {
  const t = useTranslations("auth.invite.forgotPassword");
  const { resetPasswordForEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    const { error: resetError } = await resetPasswordForEmail(email);
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-muted/30 p-4 space-y-2">
        <div className="flex items-center gap-2 font-medium text-sm">
          <CheckCircleIcon size={18} weight="fill" />
          {t("sent")}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("afterReset", { business: businessName })}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-muted/30 p-4 space-y-3">
      <p className="text-sm">{t("intro", { email })}</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="gradient"
          size="default"
          onClick={handleSend}
          disabled={loading}
          className="flex-1"
        >
          {loading ? t("sending") : t("send")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={onCancel}
          disabled={loading}
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
