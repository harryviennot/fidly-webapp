"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppSidebar } from "@/components/dashboard";
import { RoleGuard } from "@/components/auth/role-guard";
import { useBusiness } from "../../contexts/business-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { PendingActivationPage } from "@/components/pending-activation-page";
import { SuspendedPage } from "@/components/suspended-page";
import { NoActiveBusinessState } from "@/components/no-active-business-state";
import { CheckoutRequiredPage } from "@/components/billing/CheckoutRequiredPage";
import { isBusinessSetupComplete, isCheckoutSetupWindowLapsed } from "@/lib/onboarding-status";
import { TrialMobileBanner } from "@/components/billing/TrialBanner";
import { SuspendedBanner } from "@/components/billing/SuspendedOverlay";
import { OverLimitBanner } from "@/components/billing/OverLimitBanner";
import { ImpersonationBanner } from "@/components/impersonation/impersonation-banner";
import { useImpersonationBeacon } from "@/hooks/use-impersonation-beacon";
import { AchievementRecorder } from "@/components/achievements";
import { ChangelogModalProvider } from "@/components/changelog/changelog-modal-provider";

const PLAN_STEP_PATH = "/onboarding/business/plan";

function wizardResumePath(
  setupProgress: { last_step?: { chapter: string; step?: string } } | undefined,
  lapsed: boolean,
): string {
  // Card-upfront business past its free setup window (STA-215): skip straight
  // to the plan step to pay — the optional demo chapters it might resume into
  // (first stamp / broadcast / team) now hit the backend checkout gate.
  if (lapsed) return PLAN_STEP_PATH;
  const last = setupProgress?.last_step;
  if (!last?.chapter) return "/onboarding/business/welcome";
  return last.step ? `/onboarding/business/${last.chapter}/${last.step}` : `/onboarding/business/${last.chapter}`;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const {
    loading,
    currentBusiness,
    error,
    hasActiveMembership,
    hasAnyMembership,
    currentRole,
    isImpersonating,
    creatingNewBusiness,
    refetch,
  } = useBusiness();
  const t = useTranslations();
  useImpersonationBeacon();

  // Scanner members (employees) never belong in the dashboard or the owner
  // wizard. We bounce them to /scanner-welcome from the gate below — before any
  // dashboard chrome mounts — rather than relying solely on RoleGuard's late,
  // post-render redirect. (RoleGuard stays as defense-in-depth.)
  const isScanner = currentRole === "scanner";

  const setupProgress = currentBusiness?.settings?.setup_progress;
  // "Set up" means the wizard is done AND — for card-upfront new signups — a
  // subscription exists. A card-upfront business that finished every wizard
  // step but abandoned Stripe Checkout is still "not set up", so needsWizard
  // stays true and the resume path drops them back on the plan step to pay
  // (no separate paywall screen). See isBusinessSetupComplete.
  const needsWizard =
    !!currentBusiness &&
    currentBusiness.status === "active" &&
    currentRole === "owner" &&
    !isImpersonating &&
    !isBusinessSetupComplete(currentBusiness);
  // Non-owner member (admin/manager) of a card-upfront business whose owner
  // hasn't completed Stripe Checkout. They can't pay and can't run the wizard,
  // so instead of the dashboard they get an informative blocked screen. Scoped
  // to pending_checkout so it never catches a normal active/trial business.
  // See STA-215.
  const gatedNonOwner =
    !!currentBusiness &&
    currentBusiness.status === "active" &&
    currentRole !== "owner" &&
    currentRole !== "scanner" &&
    !isImpersonating &&
    currentBusiness.billing_status === "pending_checkout";
  // A signed-in user with zero memberships has just come from /signup —
  // ship them into the wizard to create their first business.
  const needsWizardNoBusiness = !loading && !hasAnyMembership && !isImpersonating;
  // "Create another business": the context has forced currentBusiness to null,
  // so route to the wizard rather than fall through to NoActiveBusinessState.
  const startingNewBusiness = creatingNewBusiness && !isImpersonating;

  // Just back from Stripe Checkout (card-upfront flow). The subscription
  // webhook may land a beat after the redirect, so rather than bounce the user
  // back to the plan step the instant they return, poll memberships for a few
  // seconds and hold a spinner until stripe_subscription_id appears.
  const [justCheckedOut, setJustCheckedOut] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("checkout") === "success"
  );
  const awaitingSubscription =
    justCheckedOut &&
    !!currentBusiness?.requires_card_upfront &&
    !currentBusiness?.stripe_subscription_id &&
    !isImpersonating;
  const pollAttempts = useRef(0);
  useEffect(() => {
    if (!awaitingSubscription) return;
    const id = setInterval(() => {
      pollAttempts.current += 1;
      if (pollAttempts.current > 12) {
        // ~24s elapsed without the webhook — give up waiting and let the
        // normal gate take over (resumes the plan step so they can retry).
        setJustCheckedOut(false);
        clearInterval(id);
        return;
      }
      void refetch();
    }, 2000);
    return () => clearInterval(id);
  }, [awaitingSubscription, refetch]);

  useEffect(() => {
    // Scanners go straight to their welcome page — they have no dashboard.
    if (!loading && isScanner) {
      router.replace("/scanner-welcome");
      return;
    }
    if (awaitingSubscription) return; // hold while the webhook lands
    if (gatedNonOwner) return; // render the blocked screen below, no redirect
    if (startingNewBusiness) {
      router.replace("/onboarding/business/welcome");
    } else if (needsWizard) {
      router.replace(wizardResumePath(setupProgress, isCheckoutSetupWindowLapsed(currentBusiness)));
    } else if (needsWizardNoBusiness) {
      router.replace("/onboarding/business/welcome");
    }
  }, [loading, isScanner, awaitingSubscription, gatedNonOwner, startingNewBusiness, needsWizard, needsWizardNoBusiness, router, setupProgress, currentBusiness]);

  // Show loading state — also while we wait for the post-checkout webhook so
  // the user isn't bounced back to the plan step the instant they return.
  if (loading || awaitingSubscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto"></div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">{t("status.loading")}</p>
        </div>
      </div>
    );
  }

  // Scanner: the useEffect above redirects to /scanner-welcome. Render a loading
  // shell in the interim so the dashboard chrome never flashes.
  if (isScanner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto"></div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">{t("status.loading")}</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-lg font-semibold mb-2">{t("layout.noBusinessFound")}</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            {error}
          </p>
        </div>
      </div>
    );
  }

  // Brand-new user (zero memberships): the useEffect above redirects them to
  // the launch wizard; render the loading shell in the interim so we don't
  // flash NoActiveBusinessState.
  if (needsWizardNoBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto"></div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">{t("status.loading")}</p>
        </div>
      </div>
    );
  }

  // Creating another business: currentBusiness is forced to null, so render the
  // loading shell while the useEffect above redirects to the wizard — never the
  // NoActiveBusinessState branch below (which would catch the null).
  if (startingNewBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto"></div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">{t("status.loading")}</p>
        </div>
      </div>
    );
  }

  // Users with memberships but none active (suspended / pending only). Show
  // the empty state so they can resolve the situation.
  if (!hasActiveMembership || !currentBusiness) {
    return <NoActiveBusinessState />;
  }

  // Show pending activation page (safety net — not reachable today since
  // selection logic prefers active memberships; kept in case pending is
  // ever reintroduced).
  if (currentBusiness.status === "pending") {
    return <PendingActivationPage business={currentBusiness} />;
  }

  // Current business is suspended — reachable only if the user explicitly
  // switched to it via the switcher. The suspended shell keeps the sidebar
  // (and switcher) accessible so the user can switch back to an active one.
  if (currentBusiness.status === "suspended") {
    return <SuspendedPage />;
  }

  // Non-owner of a card-upfront business that hasn't completed checkout. They
  // can't pay, so we show an informative blocked screen rather than the
  // dashboard or the (owner-only) wizard. See STA-215.
  if (gatedNonOwner) {
    return <CheckoutRequiredPage />;
  }

  // Owner with an incomplete launch wizard cannot reach the dashboard. The
  // useEffect above triggers the redirect; render a loading shell in the
  // interim so the dashboard chrome never flashes.
  if (needsWizard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto"></div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">{t("status.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard>
      <ChangelogModalProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="bg-[var(--background)] overflow-y-auto h-svh hide-scrollbar">
            <ImpersonationBanner />
            {currentBusiness.billing_status === "suspended" && <SuspendedBanner />}
            <OverLimitBanner />
            <TrialMobileBanner />
            <main className="p-4 md:p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </ChangelogModalProvider>
      <Toaster position="bottom-right" />
      <AchievementRecorder />
    </RoleGuard>
  );
}
