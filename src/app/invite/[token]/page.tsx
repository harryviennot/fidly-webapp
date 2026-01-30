"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-provider";
import { getInvitationByToken, acceptInvitation } from "@/api";
import type { InvitationPublic } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StampeoLogo } from "@/components/ui/stampeo-logo";
import { InviteAuthForm } from "@/components/invite/invite-auth-form";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  scanner: "Scanner",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Full access to all features including billing and settings",
  admin: "Manage team members and access all business features",
  scanner: "Scan customer passes and add stamps via the mobile app",
};

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { user, session, loading: authLoading } = useAuth();
  const [invitation, setInvitation] = useState<InvitationPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load invitation details
  useEffect(() => {
    async function loadInvitation() {
      try {
        const inv = await getInvitationByToken(token);
        setInvitation(inv);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load invitation"
        );
      } finally {
        setLoading(false);
      }
    }
    loadInvitation();
  }, [token]);

  const handleAccept = useCallback(async () => {
    if (!invitation) return;

    setAccepting(true);
    setError(null);

    try {
      await acceptInvitation(token);
      // Clear stored token
      sessionStorage.removeItem("pendingInviteToken");
      setSuccess(true);
      // Full page reload to ensure business context loads fresh with new membership
      // Scanners go to welcome page, others go to dashboard
      setTimeout(() => {
        if (invitation.role === "scanner") {
          window.location.href = "/scanner-welcome";
        } else {
          window.location.href = "/";
        }
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept invitation"
      );
      setAccepting(false);
    }
  }, [invitation, token, router]);

  // Handle auth success - auto-accept invitation
  const handleAuthSuccess = useCallback(() => {
    // Small delay to ensure session is established
    setTimeout(() => {
      handleAccept();
    }, 500);
  }, [handleAccept]);

  const handleSignInDifferentAccount = () => {
    const showcaseUrl =
      process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";
    window.location.href = `${showcaseUrl}/login?redirect=${encodeURIComponent(window.location.href)}`;
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Error state - invitation not found
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <StampeoLogo className="h-8" />
            </div>
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  const isExpiredOrUsed =
    invitation.is_expired || invitation.status !== "pending";

  // Unauthenticated - show inline auth form
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <StampeoLogo className="h-8" />
            </div>
            <CardTitle>You&apos;re Invited!</CardTitle>
            <CardDescription>
              <span className="font-medium">{invitation.inviter_name}</span>{" "}
              has invited you to join{" "}
              <span className="font-semibold">{invitation.business_name}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Invitation details */}
            <div className="bg-gray-100 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm">Role</span>
                <div className="text-right">
                  <span className="font-medium">
                    {ROLE_LABELS[invitation.role]}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5 max-w-[200px]">
                    {ROLE_DESCRIPTIONS[invitation.role]}
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="text-gray-600 text-sm">Email</span>
                <span className="font-medium text-sm">{invitation.email}</span>
              </div>
            </div>

            {/* Show error if invitation is expired or used */}
            {isExpiredOrUsed ? (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {invitation.is_expired
                  ? "This invitation has expired. Please ask the sender for a new invitation."
                  : `This invitation has already been ${invitation.status}.`}
              </div>
            ) : (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-4 text-center">
                  Create an account or sign in to accept this invitation
                </p>
                <InviteAuthForm
                  invitation={invitation}
                  onAuthSuccess={handleAuthSuccess}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const emailMismatch =
    user && user.email?.toLowerCase() !== invitation.email.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <StampeoLogo className="h-8" />
          </div>
          {success ? (
            <>
              <CardTitle className="text-green-600">Welcome aboard!</CardTitle>
              <CardDescription>
                You've successfully joined {invitation.business_name}.
                Redirecting to dashboard...
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle>You're Invited!</CardTitle>
              <CardDescription>
                <span className="font-medium">{invitation.inviter_name}</span>{" "}
                has invited you to join{" "}
                <span className="font-semibold">{invitation.business_name}</span>
              </CardDescription>
            </>
          )}
        </CardHeader>

        {!success && (
          <CardContent className="space-y-6">
            {/* Invitation details */}
            <div className="bg-gray-100 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-gray-600 text-sm">Role</span>
                <div className="text-right">
                  <span className="font-medium">
                    {ROLE_LABELS[invitation.role]}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5 max-w-[200px]">
                    {ROLE_DESCRIPTIONS[invitation.role]}
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="text-gray-600 text-sm">Email</span>
                <span className="font-medium text-sm">{invitation.email}</span>
              </div>
            </div>

            {/* Status messages */}
            {isExpiredOrUsed && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {invitation.is_expired
                  ? "This invitation has expired. Please ask the sender for a new invitation."
                  : `This invitation has already been ${invitation.status}.`}
              </div>
            )}

            {emailMismatch && !isExpiredOrUsed && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                <p>
                  This invitation was sent to{" "}
                  <span className="font-semibold">{invitation.email}</span>.
                </p>
                <p className="mt-1">
                  You're signed in as{" "}
                  <span className="font-semibold">{user?.email}</span>.
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleAccept}
                disabled={accepting || isExpiredOrUsed || !!emailMismatch}
                className="w-full"
              >
                {accepting ? "Accepting..." : "Accept Invitation"}
              </Button>

              {emailMismatch && !isExpiredOrUsed && (
                <Button
                  variant="outline"
                  onClick={handleSignInDifferentAccount}
                  className="w-full"
                >
                  Sign in with different account
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
