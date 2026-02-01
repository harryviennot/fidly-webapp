"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useBusiness } from "@/contexts/business-context";
import { canAccessRoute } from "@/lib/rbac";

interface RoleGuardProps {
  children: React.ReactNode;
}

/**
 * Role Guard Component
 *
 * Protects dashboard routes based on user role.
 * - Scanners are redirected to /scanner-welcome
 * - Admins are redirected to / if accessing owner-only routes
 * - Owners have full access
 */
export function RoleGuard({ children }: RoleGuardProps) {
  const pathname = usePathname();
  const { currentRole, loading } = useBusiness();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (loading || hasRedirectedRef.current) return;

    // Scanners should never access the dashboard
    if (currentRole === "scanner") {
      hasRedirectedRef.current = true;
      window.location.href = "/scanner-welcome";
      return;
    }

    // Check if current role can access this route
    if (currentRole && !canAccessRoute(currentRole, pathname)) {
      hasRedirectedRef.current = true;
      window.location.href = "/";
    }
  }, [loading, currentRole, pathname]);

  // Show loading while checking permissions
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto"></div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Don't render if scanner - redirect is happening
  if (currentRole === "scanner") {
    return null;
  }

  // Don't render if role can't access this route - redirect is happening
  if (currentRole && !canAccessRoute(currentRole, pathname)) {
    return null;
  }

  return <>{children}</>;
}
