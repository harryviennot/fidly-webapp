"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AppSidebar, DashboardHeader } from "@/components/dashboard";
import { RoleGuard } from "@/components/auth/role-guard";
import { useBusiness } from "../../contexts/business-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { PendingActivationPage } from "@/components/pending-activation-page";
import { SuspendedPage } from "@/components/suspended-page";
import { TrialMobileBanner } from "@/components/billing/TrialBanner";
import { SuspendedBanner } from "@/components/billing/SuspendedOverlay";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, currentBusiness, error } = useBusiness();
  const t = useTranslations();

  // Redirect to onboarding when user has no business
  const shouldRedirectToOnboarding = !loading && !error && !currentBusiness;
  useEffect(() => {
    if (shouldRedirectToOnboarding) {
      const showcaseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";
      window.location.href = `${showcaseUrl}/onboarding`;
    }
  }, [shouldRedirectToOnboarding]);

  // Show loading state or redirecting
  if (loading || shouldRedirectToOnboarding) {
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
  if (error || !currentBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-lg font-semibold mb-2">{t("layout.noBusinessFound")}</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            {error || t("layout.noBusinessAccess")}
          </p>
        </div>
      </div>
    );
  }

  // Show pending activation page
  if (currentBusiness.status === "pending") {
    return <PendingActivationPage business={currentBusiness} />;
  }

  // Show suspended page
  if (currentBusiness.status === "suspended") {
    return <SuspendedPage />;
  }

  return (
    <RoleGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-[var(--background)] overflow-y-auto max-h-screen hide-scrollbar">
          {currentBusiness.billing_status === "suspended" && <SuspendedBanner />}
          <TrialMobileBanner />
          <DashboardHeader />
          <main className="p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster position="bottom-right" />
    </RoleGuard>
  );
}
