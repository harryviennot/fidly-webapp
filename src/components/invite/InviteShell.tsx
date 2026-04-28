"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("auth.invite");

  useEffect(() => {
    if (accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      applyTheme(accentColor);
      return () => resetTheme();
    }
  }, [accentColor]);

  const showcaseUrl =
    process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <Card hover={false} className="w-full max-w-md p-0 overflow-hidden">
        <div className="flex flex-col items-center pt-10 pb-3">
          {logoUrl ? (
            <div className="h-24 w-24 rounded-2xl overflow-hidden bg-white border border-[var(--card-border)] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={businessName ?? ""}
                className="max-h-full max-w-full object-contain p-2"
              />
            </div>
          ) : (
            <StampeoLogo className="h-16 w-16 text-foreground" />
          )}
          {businessName && (
            <p className="mt-4 text-base font-semibold tracking-tight">
              {businessName}
            </p>
          )}
        </div>
        <div className="px-6 pt-2 pb-7">{children}</div>
      </Card>
      <a
        href={showcaseUrl}
        className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
      >
        <StampeoLogo className="h-3 w-3" />
        {t("poweredBy")}
      </a>
    </div>
  );
}
