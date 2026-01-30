"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { InvitationPublic } from "@/types";

interface InviteAuthFormProps {
  invitation: InvitationPublic;
  onAuthSuccess: () => void;
}

export function InviteAuthForm({ invitation, onAuthSuccess }: InviteAuthFormProps) {
  const { signUp, signIn } = useAuth();

  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState(invitation.email);
  const [name, setName] = useState(invitation.name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailMatches = email.toLowerCase() === invitation.email.toLowerCase();
  const isValidEmail = email.includes("@") && email.includes(".");
  const isValidPassword = password.length >= 6;
  const passwordsMatch = mode === "login" || password === confirmPassword;
  const isValidName = mode === "login" || name.trim().length > 0;

  const isValid =
    emailMatches && isValidEmail && isValidPassword && passwordsMatch && isValidName;

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
        if (mode === "register") {
          const { error: authError } = await signUp(email, password, name);

          if (authError) {
            const errorMsg = authError.message.toLowerCase();
            if (
              errorMsg.includes("already registered") ||
              errorMsg.includes("already exists") ||
              errorMsg.includes("user already")
            ) {
              setError("This email is already registered. Please sign in instead.");
              setMode("login");
            } else {
              setError(authError.message);
            }
            setLoading(false);
            return;
          }
        } else {
          const { error: authError } = await signIn(email, password);

          if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
          }
        }

        // Success - trigger callback
        onAuthSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    },
    [email, emailMatches, invitation.email, isValid, mode, name, onAuthSuccess, password, signIn, signUp]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={invitation.email}
          required
        />
        {!emailMatches && email.length > 0 && (
          <p className="text-xs text-red-500">
            Email must match: {invitation.email}
          </p>
        )}
      </div>

      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="name">Your Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "register" ? "At least 6 characters" : "Enter your password"}
          minLength={6}
          required
        />
      </div>

      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
          />
          {password && confirmPassword && !passwordsMatch && (
            <p className="text-xs text-red-500">Passwords do not match</p>
          )}
        </div>
      )}

      <Button type="submit" disabled={!isValid || loading} className="w-full">
        {loading
          ? mode === "register"
            ? "Creating account..."
            : "Signing in..."
          : mode === "register"
            ? "Create account & join"
            : "Sign in & join"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "register" ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setConfirmPassword("");
              }}
              className="text-[var(--accent)] hover:underline font-medium"
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className="text-[var(--accent)] hover:underline font-medium"
            >
              Create one
            </button>
          </>
        )}
      </p>
    </form>
  );
}
