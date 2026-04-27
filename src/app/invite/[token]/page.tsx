"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/auth-provider";
import { getInvitationByToken, acceptInvitation } from "@/api";
import type { InvitationPublic } from "@/types";
import { Button } from "@/components/ui/button";
import { InviteShell } from "@/components/invite/InviteShell";
import { InviteIntro } from "@/components/invite/InviteIntro";
import { InviteAuthChoice } from "@/components/invite/InviteAuthChoice";
import { InviteOtpVerify } from "@/components/invite/InviteOtpVerify";
import { InviteEmailMismatch } from "@/components/invite/InviteEmailMismatch";
import { InviteAlreadyAccepted } from "@/components/invite/InviteAlreadyAccepted";
import { InviteNotFound } from "@/components/invite/InviteNotFound";
import { InviteExpired } from "@/components/invite/InviteExpired";

type LoadStatus =
  | { kind: "loading" }
  | { kind: "loaded"; invitation: InvitationPublic }
  | { kind: "not-found" };

type UnauthPhase = "intro" | "auth-choice" | "otp";

export default function InviteAcceptPage() {
  const params = useParams();
  const token = params.token as string;
  const t = useTranslations("auth.invite");

  const { user, session, loading: authLoading } = useAuth();

  const [loadStatus, setLoadStatus] = useState<LoadStatus>({ kind: "loading" });
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Multi-step state for unauthenticated flow
  const [unauthPhase, setUnauthPhase] = useState<UnauthPhase>("intro");
  const [name, setName] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const inv = await getInvitationByToken(token);
        if (!cancelled) {
          setLoadStatus({ kind: "loaded", invitation: inv });
        }
      } catch {
        if (!cancelled) {
          setLoadStatus({ kind: "not-found" });
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const invitation =
    loadStatus.kind === "loaded" ? loadStatus.invitation : null;

  const handleAccept = useCallback(async () => {
    if (!invitation) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      await acceptInvitation(token);
      sessionStorage.removeItem("pendingInviteToken");
      setSuccess(true);
      setTimeout(() => {
        if (invitation.role === "scanner") {
          window.location.href = "/scanner-welcome";
        } else {
          window.location.href = "/";
        }
      }, 1800);
    } catch (err) {
      setAcceptError(
        err instanceof Error ? err.message : t("errors.acceptFailed")
      );
      setAccepting(false);
    }
  }, [invitation, token, t]);

  const autoAcceptedRef = useRef(false);
  useEffect(() => {
    if (autoAcceptedRef.current) return;
    if (!session || !user || !invitation) return;
    if (accepting || success) return;
    if (invitation.is_expired || invitation.status !== "pending") return;
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) return;
    autoAcceptedRef.current = true;
    // Defer to next tick so the synchronous setState inside handleAccept
    // doesn't cascade-render from inside the effect body.
    const id = setTimeout(() => {
      void handleAccept();
    }, 0);
    return () => clearTimeout(id);
  }, [session, user, invitation, accepting, success, handleAccept]);

  if (loadStatus.kind === "loading" || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  if (loadStatus.kind === "not-found") {
    return (
      <InviteShell>
        <InviteNotFound isAuthenticated={!!session} />
      </InviteShell>
    );
  }

  // Loaded — render based on invitation state + auth state
  const inv = loadStatus.invitation;
  const isPending = !inv.is_expired && inv.status === "pending";
  const emailMatchesUser =
    user && user.email?.toLowerCase() === inv.email.toLowerCase();

  // Expired
  if (inv.is_expired && inv.status === "pending") {
    return (
      <InviteShell
        businessName={inv.business_name}
        logoUrl={inv.business_logo_url}
        accentColor={inv.business_accent_color}
      >
        <InviteExpired invitation={inv} isAuthenticated={!!session} />
      </InviteShell>
    );
  }

  // Already accepted / cancelled
  if (inv.status !== "pending") {
    return (
      <InviteShell
        businessName={inv.business_name}
        logoUrl={inv.business_logo_url}
        accentColor={inv.business_accent_color}
      >
        <InviteAlreadyAccepted
          invitation={inv}
          variant={emailMatchesUser ? "by-me" : "by-other"}
          isAuthenticated={!!session}
        />
      </InviteShell>
    );
  }

  // Pending + authenticated + emails match → accept screen / auto-accept
  if (isPending && session && user && emailMatchesUser) {
    return (
      <InviteShell
        businessName={inv.business_name}
        logoUrl={inv.business_logo_url}
        accentColor={inv.business_accent_color}
      >
        {success ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-foreground">
              <CheckCircleIcon size={24} weight="fill" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">
                {t("welcomeAboard")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("joinedSuccess", { business: inv.business_name })}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 text-center">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">
                {t("step1.title", { business: inv.business_name })}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("step1.subtitle", { inviter: inv.inviter_name })}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--card-border)] p-4 text-left space-y-3">
              <div className="flex justify-between items-start gap-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("role")}
                </span>
                <div className="text-right">
                  <span className="font-medium text-sm">
                    {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px]">
                    {t(`roleDescriptions.${inv.role}`)}
                  </p>
                </div>
              </div>
            </div>
            {acceptError && (
              <div className="p-3 rounded-lg border border-[var(--card-border)] text-sm text-left">
                {acceptError}
              </div>
            )}
            <Button
              type="button"
              variant="gradient"
              size="xl"
              onClick={handleAccept}
              disabled={accepting}
              className="w-full"
            >
              {accepting
                ? t("accepting")
                : t("joinBusiness", { business: inv.business_name })}
            </Button>
          </div>
        )}
      </InviteShell>
    );
  }

  // Pending + authenticated + email mismatch
  if (isPending && session && user && !emailMatchesUser) {
    return (
      <InviteShell
        businessName={inv.business_name}
        logoUrl={inv.business_logo_url}
        accentColor={inv.business_accent_color}
      >
        <InviteEmailMismatch invitation={inv} currentEmail={user.email ?? ""} />
      </InviteShell>
    );
  }

  // Pending + unauthenticated → multi-step signup flow
  return (
    <InviteShell
      businessName={inv.business_name}
      logoUrl={inv.business_logo_url}
      accentColor={inv.business_accent_color}
    >
      {unauthPhase === "intro" && (
        <InviteIntro
          invitation={inv}
          initialName={name}
          onContinue={(value) => {
            setName(value);
            setUnauthPhase("auth-choice");
          }}
        />
      )}
      {unauthPhase === "auth-choice" && (
        <InviteAuthChoice
          invitation={inv}
          name={name}
          returnTo={`/invite/${token}`}
          onBack={() => setUnauthPhase("intro")}
          onAuthSuccess={() => {
            // signed in via existing creds, password path — auth state will
            // update via Supabase listener and trigger auto-accept.
          }}
          onPasswordRequiresOtp={() => setUnauthPhase("otp")}
        />
      )}
      {unauthPhase === "otp" && (
        <InviteOtpVerify
          email={inv.email}
          onVerified={() => {
            // Supabase auth listener will pick up the verified session and
            // trigger auto-accept via the effect above.
          }}
          onUseDifferentEmail={() => setUnauthPhase("auth-choice")}
        />
      )}
    </InviteShell>
  );
}
