"use client";

import { Warning, EnvelopeSimple } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SuspendedSidebar } from "@/components/dashboard/suspended-sidebar";

export function SuspendedPage() {
  const t = useTranslations("auth");

  return (
    <SidebarProvider>
      <SuspendedSidebar />
      <SidebarInset className="bg-[var(--background)] overflow-y-auto max-h-screen hide-scrollbar">
        <main className="relative flex flex-1 items-center justify-center p-6">
          <div className="paper-card relative max-w-lg w-full rounded-3xl p-10 text-center animate-slide-up delay-0">
            <div className="mb-6 flex justify-center animate-slide-up delay-80">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-[color-mix(in_srgb,var(--error)_12%,transparent)]">
                <Warning size={40} weight="duotone" className="text-[var(--error)]" />
              </div>
            </div>

            <h1 className="text-[26px] font-bold tracking-tight text-[var(--foreground)] mb-3 animate-slide-up delay-160">
              {t("suspended.title")}
            </h1>

            <p className="text-[var(--muted-foreground)] leading-relaxed mb-8 animate-slide-up delay-240 max-w-sm mx-auto">
              {t("suspended.description")}
            </p>

            <div className="flex flex-col gap-3 items-center animate-slide-up delay-300">
              <a
                href="mailto:support@stampeo.app"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-full hover:bg-[var(--primary-hover)] transition-all shadow-sm hover:shadow-md"
              >
                <EnvelopeSimple size={16} weight="bold" />
                {t("suspended.contactSupport")}
              </a>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
