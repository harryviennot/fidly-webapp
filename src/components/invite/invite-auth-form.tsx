"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form/form-field";
import type { InvitationPublic } from "@/types";

interface InviteAuthFormProps {
  invitation: InvitationPublic;
  onAuthSuccess: () => void;
}

export function InviteAuthForm({ invitation, onAuthSuccess }: InviteAuthFormProps) {
  const { signUp, signIn, verifyOtp, resendOtp } = useAuth();

  const [email, setEmail] = useState(invitation.email);
  const [name, setName] = useState(invitation.name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"form" | "verify">("form");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeSentMessage, setCodeSentMessage] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const emailMatches = email.toLowerCase() === invitation.email.toLowerCase();
  const isValidEmail = email.includes("@") && email.includes(".");
  const isValidPassword = password.length >= 6;
  const passwordsMatch = password === confirmPassword;
  const isValidName = name.trim().length > 0;

  const isValid =
    emailMatches && isValidEmail && isValidPassword && passwordsMatch && isValidName;

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Auto-focus OTP input
  useEffect(() => {
    if (phase === "verify") {
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, [phase]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!emailMatches) {
        setError(`Email must match the invitation email: ${invitation.email}`);
        return;
      }

      if (!isValid) return;

      setError(null);
      setLoading(true);

      try {
        // 1. Try signup first
        const { error: signUpError } = await signUp(email, password, name);

        if (!signUpError) {
          // New user created — move to OTP verification
          setResendCooldown(60);
          setPhase("verify");
          setLoading(false);
          return;
        }

        // 2. If already registered, silently try sign-in
        const errorMsg = signUpError.message.toLowerCase();
        if (
          errorMsg.includes("already registered") ||
          errorMsg.includes("already exists") ||
          errorMsg.includes("user already")
        ) {
          const { error: signInError } = await signIn(email, password);

          if (!signInError) {
            // Existing verified user — proceed directly
            onAuthSuccess();
            return;
          }

          const signInMsg = signInError.message.toLowerCase();
          if (signInMsg.includes("email not confirmed")) {
            // Existing unverified user — resend OTP and show verify phase
            await resendOtp(email);
            setResendCooldown(60);
            setPhase("verify");
            setLoading(false);
            return;
          }

          // Wrong password for existing account
          setError("An account with this email already exists. Please check your password.");
          setLoading(false);
          return;
        }

        // Other signup error
        setError(signUpError.message);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    },
    [email, emailMatches, invitation.email, isValid, name, onAuthSuccess, password, signIn, signUp, resendOtp]
  );

  const handleVerifySubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (otpCode.length !== 8) return;

      setError(null);
      setLoading(true);

      try {
        const { error: verifyError } = await verifyOtp(email, otpCode);

        if (verifyError) {
          setError("Invalid verification code, please try again");
          setOtpCode("");
          setLoading(false);
          return;
        }

        // Verification successful
        onAuthSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    },
    [email, otpCode, verifyOtp, onAuthSuccess]
  );

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    const { error } = await resendOtp(email);
    if (!error) {
      setResendCooldown(60);
      setCodeSentMessage(true);
      setTimeout(() => setCodeSentMessage(false), 3000);
    }
  }, [resendCooldown, resendOtp, email]);

  const handleOtpChange = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    setOtpCode(digits);
  }, []);

  if (phase === "verify") {
    return (
      <form onSubmit={handleVerifySubmit} className="space-y-4">
        <div className="text-center mb-2">
          <p className="text-sm text-muted-foreground">
            We sent an 8-digit code to <strong>{email}</strong>
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
            {error}
          </div>
        )}

        {codeSentMessage && (
          <div className="p-3 rounded-lg bg-green-50 text-green-600 text-sm border border-green-200">
            New code sent!
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="otp" className="text-sm font-medium">Verification code</label>
          <input
            ref={otpInputRef}
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otpCode}
            onChange={(e) => handleOtpChange(e.target.value)}
            maxLength={8}
            placeholder="00000000"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-center text-2xl font-mono tracking-[0.5em] shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <Button type="submit" disabled={otpCode.length !== 8 || loading} className="w-full">
          {loading ? "Verifying..." : "Verify & join"}
        </Button>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-[var(--accent)] hover:underline font-medium"
              >
                Resend code
              </button>
            )}
          </p>
          <p>
            <button
              type="button"
              onClick={() => {
                setPhase("form");
                setOtpCode("");
                setError(null);
                setCodeSentMessage(false);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Use a different email
            </button>
          </p>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
          {error}
        </div>
      )}

      <FormField
        label="Email"
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={invitation.email}
        required
        error={!emailMatches && email.length > 0 ? `Email must match: ${invitation.email}` : undefined}
      />

      <FormField
        label="Your Name"
        id="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your full name"
        required
      />

      <FormField
        label="Password"
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 6 characters"
        minLength={6}
        required
      />

      <FormField
        label="Confirm Password"
        id="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm your password"
        required
        error={password && confirmPassword && !passwordsMatch ? "Passwords do not match" : undefined}
      />

      <Button type="submit" disabled={!isValid || loading} className="w-full">
        {loading ? "Please wait..." : "Create account & join"}
      </Button>
    </form>
  );
}
