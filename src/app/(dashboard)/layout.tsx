"use client";

import { DashboardSidebar, DashboardHeader } from "@/components/dashboard";
import { useBusiness } from "../../contexts/business-context";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, currentBusiness, error } = useBusiness();

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error or no business state
  if (error || !currentBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-lg font-semibold mb-2">No Business Found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {error || "You don't have access to any business yet."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      <div className="pl-[280px]">
        <DashboardHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
