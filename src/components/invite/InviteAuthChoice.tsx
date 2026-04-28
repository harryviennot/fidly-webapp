"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeftIcon,
  CaretRightIcon,
  CheckIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { AppleLogo, GoogleLogo } from "@/components/auth/OAuthButtons";
import { useAuth, type OAuthProvider } from "@/contexts/auth-provider";
import type { InvitationPublic } from "@/types";
import { InviteForgotPassword } from "./InviteForgotPassword";
import { writeLastLogin } from "@/lib/last-login";
import { useLastLogin } from "@/lib/use-last-login";

type SubPhase = "choose" | "password" | "forgot";

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
  const tOAuth = useTranslations("auth.oauth");

  const { signUp, signIn, signInWithOAuth, resendOtp } = useAuth();

  const [subPhase, setSubPhase] = useState<SubPhase>("choose");
  const [pendingOAuth, setPendingOAuth] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only hint at the previous method when the cookie's email matches the
  // invite — otherwise we'd be showing a misleading badge to a different
  // person on a shared device.
  const lastLogin = useLastLogin();
  const lastUsed =
    lastLogin?.email?.toLowerCase() === invitation.email.toLowerCase()
      ? lastLogin?.method ?? null
      : null;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleOAuth = useCallback(
    async (provider: OAuthProvider) => {
      setError(null);
      setPendingOAuth(provider);
      const { error: oauthError } = await signInWithOAuth(provider, returnTo);
      if (oauthError) {
        setError(tOAuth("error"));
        setPendingOAuth(null);
      }
    },
    [signInWithOAuth, returnTo, tOAuth]
  );

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
              writeLastLogin("email", invitation.email);
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

  // ---- choose method ----
  if (subPhase === "choose") {
    const lastUsedLabel = tOAuth("lastUsed");
    const emailDomain = invitation.email.split("@")[1]?.toLowerCase() ?? "";
    const isGoogleEmail = ["gmail.com", "googlemail.com"].includes(emailDomain);
    const isAppleEmail = ["icloud.com", "me.com", "mac.com"].includes(emailDomain);
    const showGoogle = !isAppleEmail;
    const showApple = !isGoogleEmail;
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {tStep2("greeting", { name })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tStep2("howToJoin", { business: invitation.business_name })}
          </p>
          <p className="text-xs text-muted-foreground">
            {tStep2("emailReminder", { email: invitation.email })}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-[var(--card-border)] text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {showGoogle && (
            <MethodButton
              onClick={() => handleOAuth("google")}
              disabled={pendingOAuth !== null}
              loading={pendingOAuth === "google"}
              loadingLabel={tOAuth("connecting")}
              icon={<GoogleLogo size={20} />}
              lastUsedLabel={lastUsed === "google" ? lastUsedLabel : undefined}
            >
              {tStep2("continueGoogle")}
            </MethodButton>
          )}
          {showApple && (
            <MethodButton
              onClick={() => handleOAuth("apple")}
              disabled={pendingOAuth !== null}
              loading={pendingOAuth === "apple"}
              loadingLabel={tOAuth("connecting")}
              icon={<AppleLogo size={20} />}
              lastUsedLabel={lastUsed === "apple" ? lastUsedLabel : undefined}
            >
              {tStep2("continueApple")}
            </MethodButton>
          )}
          <MethodButton
            onClick={() => setSubPhase("password")}
            disabled={pendingOAuth !== null}
            icon={<EnvelopeSimpleIcon size={20} />}
            lastUsedLabel={lastUsed === "email" ? lastUsedLabel : undefined}
          >
            {tStep2("continueEmail")}
          </MethodButton>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon size={14} />
            {tStep2("editName")}
          </button>
        </div>
      </div>
    );
  }

  // ---- forgot password ----
  if (subPhase === "forgot") {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            {tForgot("link").replace(/\?$/, "")}
          </h1>
        </div>
        <InviteForgotPassword
          email={invitation.email}
          businessName={invitation.business_name}
          onCancel={() => setSubPhase("password")}
        />
      </div>
    );
  }

  // ---- password ----
  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {tStep2("passwordTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tStep2("passwordSubtitle", { email: invitation.email })}
        </p>
      </div>

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
                      ? "text-foreground"
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

      <div className="flex items-center justify-between pt-1 text-sm">
        <button
          type="button"
          onClick={() => {
            setSubPhase("choose");
            setError(null);
          }}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon size={14} />
          {tStep2("chooseDifferentMethod")}
        </button>
        <button
          type="button"
          onClick={() => {
            setSubPhase("forgot");
            setError(null);
          }}
          className="text-[var(--accent)] hover:underline"
        >
          {tForgot("link")}
        </button>
      </div>
    </div>
  );
}

interface MethodButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  lastUsedLabel?: string;
}

function MethodButton({
  onClick,
  disabled,
  loading,
  loadingLabel,
  icon,
  children,
  lastUsedLabel,
}: MethodButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-5 h-14 rounded-full border border-[var(--card-border)] bg-card hover:bg-muted/40 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="flex items-center justify-center w-7 h-7">{icon}</span>
      <span className="font-medium text-sm flex-1">
        {loading && loadingLabel ? loadingLabel : children}
      </span>
      {lastUsedLabel && (
        <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
          {lastUsedLabel}
        </span>
      )}
      <CaretRightIcon
        size={16}
        className="text-muted-foreground"
        weight="bold"
      />
    </button>
  );
}
