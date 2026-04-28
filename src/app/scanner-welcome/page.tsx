"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  DeviceMobileIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/contexts/auth-provider";
import { useBusiness } from "@/contexts/business-context";
import { Button } from "@/components/ui/button";
import { InviteShell } from "@/components/invite/InviteShell";

const scanUrl = process.env.NEXT_PUBLIC_SCAN_URL;

export default function ScannerWelcomePage() {
  const { signOut } = useAuth();
  const { currentRole, currentBusiness, loading } = useBusiness();
  const t = useTranslations("auth.scannerWelcome");
  const tAuth = useTranslations("auth");

  useEffect(() => {
    if (!loading && currentRole && currentRole !== "scanner") {
      window.location.href = "/";
    }
  }, [loading, currentRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  return (
    <InviteShell
      businessName={currentBusiness?.name}
      logoUrl={currentBusiness?.logo_url}
    >
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-foreground">
            <CheckCircleIcon size={24} weight="fill" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {t("allSet")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {currentBusiness
                ? t("joinedAs", { business: currentBusiness.name })
                : t("setupComplete")}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--card-border)] p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
              <DeviceMobileIcon size={18} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{t("downloadApp")}</p>
              <p className="text-xs text-muted-foreground">
                {t("downloadDescription")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {scanUrl && (
              <Button
                asChild
                variant="gradient"
                size="xl"
                className="w-full"
              >
                <a href={scanUrl} target="_blank" rel="noopener noreferrer">
                  {t("openScanner")}
                  <ArrowSquareOutIcon className="ml-1 h-4 w-4" />
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="xl"
              className="w-full"
              disabled
            >
              {t("appStore")}
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="w-full"
              disabled
            >
              {t("googlePlay")}
            </Button>
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => signOut()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tAuth("signOut")}
          </button>
        </div>
      </div>
    </InviteShell>
  );
}
