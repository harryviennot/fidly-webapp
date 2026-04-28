"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { InviteShell } from "@/components/invite/InviteShell";
import { InviteIntro } from "@/components/invite/InviteIntro";
import { InviteAuthChoice } from "@/components/invite/InviteAuthChoice";
import { InviteOtpVerify } from "@/components/invite/InviteOtpVerify";
import { InviteEmailMismatch } from "@/components/invite/InviteEmailMismatch";
import { InviteAlreadyAccepted } from "@/components/invite/InviteAlreadyAccepted";
import { InviteNotFound } from "@/components/invite/InviteNotFound";
import { InviteExpired } from "@/components/invite/InviteExpired";
import { InviteForgotPassword } from "@/components/invite/InviteForgotPassword";
import type { InvitationPublic } from "@/types";

const STATES = [
  { id: "not-found", label: "Not found (404)" },
  { id: "expired", label: "Expired" },
  { id: "already-by-me", label: "Already accepted (by me)" },
  { id: "already-by-other", label: "Already accepted (by other / signed-out)" },
  { id: "email-mismatch", label: "Signed in, wrong email" },
  { id: "intro", label: "Step 1 — name capture" },
  { id: "auth-choice", label: "Step 2 — choose method" },
  { id: "forgot-password", label: "Forgot-password panel" },
  { id: "otp", label: "OTP verify" },
  { id: "auth-match-pending", label: "Signed in, can accept" },
  { id: "success", label: "Success / welcome" },
] as const;

type StateId = (typeof STATES)[number]["id"];

function makeMockInvitation(overrides: Partial<InvitationPublic> = {}): InvitationPublic {
  return {
    id: "preview-id",
    email: "claudecodebro@gmail.com",
    name: "Harry",
    role: "admin",
    status: "pending",
    expires_at: new Date(Date.now() + 86400_000 * 3).toISOString(),
    accepted_at: null,
    business_name: "Jeff's Coffee",
    business_logo_url: null,
    business_accent_color: null,
    inviter_name: "Harry",
    is_expired: false,
    ...overrides,
  };
}

const SAMPLE_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#1a1a1a"/><text x="32" y="42" font-family="Arial,sans-serif" font-size="32" fill="white" text-anchor="middle" font-weight="700">J</text></svg>`
  );

export default function InvitePreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [stateId, setStateId] = useState<StateId>("intro");
  const [withBranding, setWithBranding] = useState(true);
  const [accent, setAccent] = useState("#7c3aed");
  const [role, setRole] = useState<"admin" | "scanner">("admin");

  const invitation = makeMockInvitation({
    role,
    business_logo_url: withBranding ? SAMPLE_LOGO : null,
    business_accent_color: withBranding ? accent : null,
    status:
      stateId === "already-by-me" || stateId === "already-by-other"
        ? "accepted"
        : "pending",
    is_expired: stateId === "expired",
    accepted_at:
      stateId === "already-by-me" || stateId === "already-by-other"
        ? new Date().toISOString()
        : null,
  });

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r border-[var(--card-border)] p-4 space-y-4 overflow-y-auto bg-card sticky top-0 h-screen">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">
            Invite UX preview
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dev-only. Render each state with mock data.
          </p>
        </div>

        <div className="space-y-1">
          {STATES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStateId(s.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                stateId === s.id
                  ? "bg-foreground text-background font-medium"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="border-t border-[var(--card-border)] pt-4 space-y-3">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={withBranding}
              onChange={(e) => setWithBranding(e.target.checked)}
            />
            Business branding (logo + accent)
          </label>
          <label className="flex items-center gap-2 text-xs">
            Accent
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              disabled={!withBranding}
              className="h-6 w-10 cursor-pointer disabled:opacity-50"
            />
            <span className="font-mono text-[10px] text-muted-foreground">
              {accent}
            </span>
          </label>
          <label className="flex items-center gap-2 text-xs">
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "scanner")}
              className="text-xs border border-[var(--card-border)] rounded px-1 py-0.5 bg-background"
            >
              <option value="admin">admin</option>
              <option value="scanner">scanner</option>
            </select>
          </label>
        </div>

        <div className="border-t border-[var(--card-border)] pt-4 text-[10px] text-muted-foreground leading-relaxed">
          Buttons that trigger network calls (sign-in, OAuth, accept, reset
          email) will still fire — preview only the rendering, not the action.
        </div>
      </aside>

      {/* Stage */}
      <main className="flex-1 min-w-0">
        <StateRenderer stateId={stateId} invitation={invitation} />
      </main>
    </div>
  );
}

interface StateRendererProps {
  stateId: StateId;
  invitation: InvitationPublic;
}

function StateRenderer({ stateId, invitation }: StateRendererProps) {
  const t = useTranslations("auth.invite");

  if (stateId === "not-found") {
    return (
      <InviteShell>
        <InviteNotFound isAuthenticated={false} />
      </InviteShell>
    );
  }

  return (
    <InviteShell
      businessName={invitation.business_name}
      logoUrl={invitation.business_logo_url}
      accentColor={invitation.business_accent_color}
    >
      {stateId === "expired" && (
        <InviteExpired invitation={invitation} isAuthenticated={false} />
      )}
      {stateId === "already-by-me" && (
        <InviteAlreadyAccepted
          invitation={invitation}
          variant="by-me"
          isAuthenticated
        />
      )}
      {stateId === "already-by-other" && (
        <InviteAlreadyAccepted
          invitation={invitation}
          variant="by-other"
          isAuthenticated={false}
        />
      )}
      {stateId === "email-mismatch" && (
        <InviteEmailMismatch
          invitation={invitation}
          currentEmail="harry.viennot.2@gmail.com"
        />
      )}
      {stateId === "intro" && (
        <InviteIntro
          invitation={invitation}
          onContinue={() => alert("→ would advance to Step 2")}
        />
      )}
      {stateId === "auth-choice" && (
        <InviteAuthChoice
          invitation={invitation}
          name="Harry"
          onBack={() => alert("→ would return to Step 1")}
          onAuthSuccess={() => alert("auth success → would show join prompt")}
          onPasswordRequiresOtp={() => alert("→ would show OTP step")}
        />
      )}
      {stateId === "forgot-password" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            (Inline panel as it appears inside Step 2.)
          </p>
          <InviteForgotPassword
            email={invitation.email}
            businessName={invitation.business_name}
            onCancel={() => alert("→ would return to choose method")}
          />
        </div>
      )}
      {stateId === "otp" && (
        <InviteOtpVerify
          email={invitation.email}
          onVerified={() => alert("verified → would auto-accept")}
          onUseDifferentEmail={() => alert("→ would return to Step 2")}
        />
      )}
      {stateId === "auth-match-pending" && (
        <div className="space-y-5 text-center">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {t("step1.title", { business: invitation.business_name })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("step1.subtitle", { inviter: invitation.inviter_name })}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--card-border)] p-4 text-left space-y-3">
            <div className="flex justify-between items-start gap-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("role")}
              </span>
              <div className="text-right">
                <span className="font-medium text-sm">
                  {invitation.role.charAt(0).toUpperCase() +
                    invitation.role.slice(1)}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px]">
                  {t(`roleDescriptions.${invitation.role}`)}
                </p>
              </div>
            </div>
          </div>
          <Button type="button" variant="gradient" size="xl" className="w-full">
            {t("joinBusiness", { business: invitation.business_name })}
          </Button>
        </div>
      )}
      {stateId === "success" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-foreground">
            <CheckCircleIcon size={24} weight="fill" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {t("welcomeAboard")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("joinedSuccess", { business: invitation.business_name })}
            </p>
          </div>
        </div>
      )}
    </InviteShell>
  );
}
