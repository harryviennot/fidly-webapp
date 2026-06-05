"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircleIcon, DeviceMobileIcon } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/auth-provider";
import { useBusiness } from "@/contexts/business-context";
import { InviteShell } from "@/components/invite/InviteShell";

const scanUrl = process.env.NEXT_PUBLIC_SCAN_URL;

// Live store listings for the Stampeo scanner app (region-free / locale-aware
// canonical forms so each store opens in the user's local market + language).
const APP_STORE_URL = "https://apps.apple.com/app/id6761758382";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.hryvnt.stampeo";

export default function ScannerWelcomePage() {
  const { signOut } = useAuth();
  const { currentRole, currentBusiness, loading } = useBusiness();
  const t = useTranslations("auth.scannerWelcome");
  const tAuth = useTranslations("auth");
  const locale = useLocale();

  const appleSrc = locale === "fr" ? "/AppStoreFR.svg" : "/AppStore.svg";
  const googleSrc = locale === "fr" ? "/GooglePlayFR.svg" : "/GooglePlay.svg";

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

          <div className="flex flex-col items-center gap-3">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("appStoreAlt")}
              className="block hover:opacity-90 transition-opacity"
            >
              <Image
                src={appleSrc}
                alt={t("appStoreAlt")}
                width={120}
                height={40}
                className="h-[52px] w-auto"
              />
            </a>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("googlePlayAlt")}
              className="block hover:opacity-90 transition-opacity"
            >
              <Image
                src={googleSrc}
                alt={t("googlePlayAlt")}
                width={239}
                height={71}
                className="h-[52px] w-auto"
              />
            </a>
          </div>

          {scanUrl && (
            <div className="text-center">
              <a
                href={scanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors"
              >
                {t("continueInBrowser")}
              </a>
            </div>
          )}
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
