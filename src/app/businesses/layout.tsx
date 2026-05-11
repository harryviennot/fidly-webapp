"use client";

import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { useBusiness } from "@/contexts/business-context";
import { useAuth } from "@/contexts/auth-provider";
import { Button } from "@/components/ui/button";
import { StampeoLogo } from "@/components/ui/stampeo-logo";
import { Toaster } from "@/components/ui/sonner";
import { ImpersonationBanner } from "@/components/impersonation/impersonation-banner";
import { useImpersonationBeacon } from "@/hooks/use-impersonation-beacon";

export default function BusinessesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  useImpersonationBeacon();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <ImpersonationBanner />
      <header className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-[var(--border)] bg-[var(--background)]">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <StampeoLogo className="w-6 h-6 text-[var(--accent)]" />
          <span className="hidden sm:inline">Stampeo</span>
        </Link>
        <div className="flex items-center gap-2">
          {currentBusiness && (
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/">
                <CaretLeftIcon size={14} className="mr-1" />
                {currentBusiness.name}
              </Link>
            </Button>
          )}
          {user?.email && (
            <span className="hidden md:inline text-[11px] text-[var(--muted-foreground)]">
              {user.email}
            </span>
          )}
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">{children}</main>
      <Toaster position="bottom-right" />
    </div>
  );
}
