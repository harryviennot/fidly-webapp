"use client";

import { AppSidebar, DashboardHeader } from "@/components/dashboard";
import { RoleGuard } from "@/components/auth/role-guard";
import { useBusiness } from "../../contexts/business-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { PendingActivationPage } from "@/components/pending-activation-page";
import { SuspendedPage } from "@/components/suspended-page";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, currentBusiness, error } = useBusiness();

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto"></div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error or no business state
  if (error || !currentBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-lg font-semibold mb-2">No Business Found</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            {error || "You don't have access to any business yet."}
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
          <DashboardHeader />
          <main className="p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster position="bottom-right" />
    </RoleGuard>
  );
}
