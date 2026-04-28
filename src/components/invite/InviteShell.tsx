"use client";

import { useEffect } from "react";
import { applyTheme, resetTheme } from "@/utils/theme";
import { StampeoLogo } from "@/components/ui/stampeo-logo";
import { Card } from "@/components/ui/card";

interface InviteShellProps {
  businessName?: string;
  logoUrl?: string | null;
  accentColor?: string | null;
  children: React.ReactNode;
}

export function InviteShell({
  businessName,
  logoUrl,
  accentColor,
  children,
}: InviteShellProps) {
  useEffect(() => {
    if (accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      applyTheme(accentColor);
      return () => resetTheme();
    }
  }, [accentColor]);

  const showcaseUrl =
    process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* Top-of-page Stampeo brand header — replaces an in-card logo for
          context-less states (NotFound, etc.) and stacks above the card for
          branded states. */}
      <a
        href={showcaseUrl}
        className="absolute top-6 left-6 inline-flex items-center gap-2 group transition-transform hover:scale-105"
        aria-label="Stampeo"
      >
        <StampeoLogo className="w-6 h-6 text-foreground" />
        <span className="text-lg font-bold tracking-tight text-foreground">
          Stampeo
        </span>
      </a>

      <Card hover={false} className="w-full max-w-md p-0 overflow-hidden">
        {logoUrl && (
          <div className="flex flex-col items-center pt-10 pb-3">
            <div className="h-24 w-24 rounded-2xl overflow-hidden bg-white border border-[var(--card-border)] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={businessName ?? ""}
                className="max-h-full max-w-full object-contain p-2"
              />
            </div>
            {businessName && (
              <p className="mt-4 text-base font-semibold tracking-tight">
                {businessName}
              </p>
            )}
          </div>
        )}
        <div className={logoUrl ? "px-6 pt-2 pb-7" : "px-6 pt-8 pb-7"}>
          {children}
        </div>
      </Card>
    </div>
  );
}
