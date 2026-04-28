"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-provider";
import { writeLastLogin } from "@/lib/last-login";

interface InviteOtpVerifyProps {
  email: string;
  initialCooldown?: number;
  onVerified: () => void;
  onUseDifferentEmail: () => void;
}

export function InviteOtpVerify({
  email,
  initialCooldown = 60,
  onVerified,
  onUseDifferentEmail,
}: InviteOtpVerifyProps) {
  const t = useTranslations("auth.invite.otp");
  const { verifyOtp, resendOtp } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(initialCooldown);
  const [resentMessage, setResentMessage] = useState(false);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (otp.length !== 6) return;
      setLoading(true);
      setError(null);
      const { error: verifyError } = await verifyOtp(email, otp);
      if (verifyError) {
        setError(t("invalid"));
        setOtp("");
        setLoading(false);
        return;
      }
      writeLastLogin("email", email);
      onVerified();
    },
    [email, otp, verifyOtp, t, onVerified]
  );

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    const { error: resendError } = await resendOtp(email);
    if (!resendError) {
      setResendCooldown(60);
      setResentMessage(true);
      setTimeout(() => setResentMessage(false), 3000);
    }
  }, [resendCooldown, resendOtp, email]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { email })}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-[var(--card-border)] text-sm">
          {error}
        </div>
      )}

      {resentMessage && (
        <div className="p-3 rounded-lg border border-[var(--card-border)] bg-muted/30 text-sm">
          {t("resent")}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="otp" className="text-sm font-medium">
          {t("label")}
        </label>
        <input
          ref={inputRef}
          id="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          placeholder="000000"
          className="w-full px-4 py-3.5 rounded-xl border border-[var(--border)] bg-white/50 dark:bg-white/5 text-center text-2xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] outline-none transition-all"
        />
      </div>

      <Button
        type="submit"
        disabled={otp.length !== 6 || loading}
        variant="gradient"
        size="xl"
        className="w-full"
      >
        {loading ? t("verifying") : t("verify")}
      </Button>

      <div className="text-center space-y-2 text-sm">
        <p className="text-muted-foreground">
          {resendCooldown > 0 ? (
            t("resendIn", { seconds: resendCooldown })
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-[var(--accent)] hover:underline font-medium"
            >
              {t("resend")}
            </button>
          )}
        </p>
        <button
          type="button"
          onClick={onUseDifferentEmail}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("useDifferentEmail")}
        </button>
      </div>
    </form>
  );
}
