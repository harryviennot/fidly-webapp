"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon, CheckIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { OAuthButtons, OAuthDivider } from "@/components/auth/OAuthButtons";
import { useAuth } from "@/contexts/auth-provider";
import type { InvitationPublic } from "@/types";
import { InviteForgotPassword } from "./InviteForgotPassword";

interface InviteAuthChoiceProps {
  invitation: InvitationPublic;
  name: string;
  returnTo?: string;
  onBack: () => void;
  onAuthSuccess: () => void;
  onPasswordRequiresOtp: () => void;
}

export function InviteAuthChoice({
  invitation,
  name,
  returnTo,
  onBack,
  onAuthSuccess,
  onPasswordRequiresOtp,
}: InviteAuthChoiceProps) {
  const tStep2 = useTranslations("auth.invite.step2");
  const tChecks = useTranslations("auth.invite.passwordChecks");
  const tErrors = useTranslations("auth.invite.errors");
  const tForgot = useTranslations("auth.invite.forgotPassword");

  const { signUp, signIn, resendOtp } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const passwordChecks = useMemo(
    () => ({
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[^a-zA-Z0-9]/.test(password),
      minLength: password.length >= 6,
    }),
    [password]
  );
  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = isPasswordStrong && passwordsMatch && password.length > 0;

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;

      setError(null);
      setLoading(true);

      try {
        const { data: signUpData, error: signUpError } = await signUp(
          invitation.email,
          password,
          name
        );

        if (!signUpError) {
          const isExistingUser =
            !signUpData?.user || signUpData.user.identities?.length === 0;
          if (isExistingUser) {
            const { error: signInError } = await signIn(
              invitation.email,
              password
            );
            if (!signInError) {
              onAuthSuccess();
              return;
            }
            const msg = signInError.message.toLowerCase();
            if (msg.includes("email not confirmed")) {
              await resendOtp(invitation.email);
              onPasswordRequiresOtp();
              return;
            }
            setError(tErrors("accountExists"));
            setLoading(false);
            return;
          }

          // New user — needs OTP verification
          onPasswordRequiresOtp();
          return;
        }

        const errorMsg = signUpError.message.toLowerCase();
        if (
          errorMsg.includes("already registered") ||
          errorMsg.includes("already exists") ||
          errorMsg.includes("user already")
        ) {
          const { error: signInError } = await signIn(
            invitation.email,
            password
          );
          if (!signInError) {
            onAuthSuccess();
            return;
          }
          const msg = signInError.message.toLowerCase();
          if (msg.includes("email not confirmed")) {
            await resendOtp(invitation.email);
            onPasswordRequiresOtp();
            return;
          }
          setError(tErrors("accountExists"));
          setLoading(false);
          return;
        }

        setError(signUpError.message);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    },
    [
      canSubmit,
      invitation.email,
      name,
      password,
      signUp,
      signIn,
      resendOtp,
      onAuthSuccess,
      onPasswordRequiresOtp,
      tErrors,
    ]
  );

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {tStep2("greeting", { name })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tStep2("howToJoin", { business: invitation.business_name })}
        </p>
      </div>

      <OAuthButtons
        returnTo={returnTo}
        disabled={loading}
        onError={(message) => setError(message)}
      />
      <OAuthDivider />

      {showForgot ? (
        <InviteForgotPassword
          email={invitation.email}
          businessName={invitation.business_name}
          onCancel={() => setShowForgot(false)}
        />
      ) : (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-[var(--card-border)] text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="invite-password" className="text-sm font-medium">
              {tStep2("passwordLabel")}
            </label>
            <div className="relative">
              <input
                id="invite-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tStep2("passwordPlaceholder")}
                minLength={6}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3.5 pr-12 rounded-xl border border-[var(--border)] bg-white/50 dark:bg-white/5 focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
            {password.length > 0 && (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
                {(
                  [
                    ["lowercase", tChecks("lowercase")],
                    ["uppercase", tChecks("uppercase")],
                    ["number", tChecks("number")],
                    ["symbol", tChecks("symbol")],
                    ["minLength", tChecks("minLength")],
                  ] as const
                ).map(([key, label]) => (
                  <li
                    key={key}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${
                      passwordChecks[key]
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    <CheckIcon
                      size={12}
                      weight={passwordChecks[key] ? "bold" : "regular"}
                    />
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="invite-confirm-password" className="text-sm font-medium">
              {tStep2("confirmPasswordLabel")}
            </label>
            <input
              id="invite-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={tStep2("confirmPasswordPlaceholder")}
              required
              autoComplete="new-password"
              className="w-full px-4 py-3.5 rounded-xl border border-[var(--border)] bg-white/50 dark:bg-white/5 focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] outline-none transition-all"
            />
            {password && confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500">
                {tStep2("passwordsDontMatch")}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={!canSubmit || loading}
            variant="gradient"
            size="xl"
            className="w-full"
          >
            {loading ? tStep2("creating") : tStep2("createAccount")}
          </Button>
        </form>
      )}

      <div className="flex items-center justify-between pt-2 text-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon size={14} />
          {tStep2("editName")}
        </button>
        {!showForgot && (
          <button
            type="button"
            onClick={() => {
              setShowForgot(true);
              setError(null);
            }}
            className="text-[var(--accent)] hover:underline"
          >
            {tForgot("link")}
          </button>
        )}
      </div>

    </div>
  );
}
