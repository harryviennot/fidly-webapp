"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { AppSidebar, DashboardHeader } from "@/components/dashboard";
import { RoleGuard } from "@/components/auth/role-guard";
import { useBusiness } from "../../contexts/business-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { PendingActivationPage } from "@/components/pending-activation-page";
import { SuspendedPage } from "@/components/suspended-page";
import { NoActiveBusinessState } from "@/components/no-active-business-state";
import { TrialMobileBanner } from "@/components/billing/TrialBanner";
import { SuspendedBanner } from "@/components/billing/SuspendedOverlay";
import { OverLimitBanner } from "@/components/billing/OverLimitBanner";
import { ImpersonationBanner } from "@/components/impersonation/impersonation-banner";
import { useImpersonationBeacon } from "@/hooks/use-impersonation-beacon";

// Routes that must render regardless of current-business state. The
// businesses listing is the user's entry point for picking a business in
// the first place, so it cannot be gated on having one already selected.
const BUSINESS_AGNOSTIC_PATHS = ["/businesses"];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, currentBusiness, error, hasActiveMembership } = useBusiness();
  const t = useTranslations();
  const pathname = usePathname();
  useImpersonationBeacon();

  const isBusinessAgnosticRoute = BUSINESS_AGNOSTIC_PATHS.some((p) => pathname?.startsWith(p));

  // Show loading state
  if (loading) {
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

  // Business-agnostic routes (e.g. /businesses) must render even when the
  // user has no active business — that page IS the entry point for picking
  // or browsing businesses. RoleGuard is intentionally skipped: with no
  // currentRole, it would redirect to "/" and trap the user out of the
  // listing. The listing page itself enforces "superadmin or has ≥1
  // membership" since rendering it requires either condition to be true.
  if (isBusinessAgnosticRoute && (!hasActiveMembership || !currentBusiness)) {
    return (
      <>
        <ImpersonationBanner />
        <main className="min-h-screen bg-[var(--background)] p-4 md:p-6">{children}</main>
        <Toaster position="bottom-right" />
      </>
    );
  }

  // No usable business — zero memberships, only suspended, or only pending.
  // Show the explicit empty state with a "create new business" CTA rather
  // than auto-redirecting or silently rendering a suspended business.
  if (!hasActiveMembership || !currentBusiness) {
    return <NoActiveBusinessState />;
  }

  // Show pending activation page (safety net — not reachable today since
  // selection logic prefers active memberships; kept in case pending is
  // ever reintroduced).
  if (currentBusiness.status === "pending" && !isBusinessAgnosticRoute) {
    return <PendingActivationPage business={currentBusiness} />;
  }

  // Current business is suspended — reachable only if the user explicitly
  // switched to it via the switcher. The suspended shell keeps the sidebar
  // (and switcher) accessible so the user can switch back to an active one.
  if (currentBusiness.status === "suspended" && !isBusinessAgnosticRoute) {
    return <SuspendedPage />;
  }

  return (
    <RoleGuard>
      <ImpersonationBanner />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-[var(--background)] overflow-y-auto max-h-screen hide-scrollbar">
          {currentBusiness.billing_status === "suspended" && <SuspendedBanner />}
          <OverLimitBanner />
          <TrialMobileBanner />
          <DashboardHeader />
          <main className="p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster position="bottom-right" />
    </RoleGuard>
  );
}
