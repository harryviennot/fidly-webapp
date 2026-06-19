"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowSquareOutIcon,
  CheckIcon,
  DeviceMobileIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/contexts/auth-provider";
import { useBusiness } from "@/contexts/business-context";
import { StampeoLogo } from "@/components/ui/stampeo-logo";
import { WizardLanguageSwitcher } from "@/components/onboarding/WizardLanguageSwitcher";

const scanUrl = process.env.NEXT_PUBLIC_SCAN_URL;
const showcaseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";

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

  const appleSrc = locale === "fr" ? "/AppStoreFR.svg" : locale === "es" ? "/AppStoreES.svg" : "/AppStore.svg";
  const googleSrc = locale === "fr" ? "/GooglePlayFR.svg" : locale === "es" ? "/GooglePlayES.svg" : "/GooglePlay.svg";

  useEffect(() => {
    if (!loading && currentRole && currentRole !== "scanner") {
      window.location.href = "/";
    }
  }, [loading, currentRole]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--background)]">
      {/* Brand header — Stampeo mark left, language toggle right. Borderless
          so the page reads as an airy celebration screen, not another step. */}
      <header className="flex items-center justify-between px-5 py-4 min-[768px]:px-8 min-[768px]:py-5">
        <a
          href={showcaseUrl}
          className="group inline-flex items-center gap-2 transition-transform hover:scale-[1.03]"
          aria-label="Stampeo"
        >
          <StampeoLogo className="h-6 w-6 text-[var(--foreground)]" />
          <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">
            Stampeo
          </span>
        </a>
        <WizardLanguageSwitcher />
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-5 py-8 min-[768px]:py-12">
          {/* Hero — business identity + "you're set" signal */}
          <div className="flex flex-col items-center text-center animate-slide-up">
            {currentBusiness?.logo_url ? (
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-[var(--card-border)] bg-white shadow-sm min-[768px]:h-24 min-[768px]:w-24">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentBusiness.logo_url}
                    alt={currentBusiness.name ?? ""}
                    className="max-h-full max-w-full object-contain p-2.5"
                  />
                </div>
                <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-sm ring-4 ring-[var(--background)]">
                  <CheckIcon size={15} weight="bold" />
                </span>
              </div>
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-light)] text-[var(--accent)] min-[768px]:h-20 min-[768px]:w-20">
                <CheckIcon size={32} weight="bold" />
              </span>
            )}

            <h1 className="mt-5 wiz-h font-semibold tracking-tight text-[var(--foreground)]">
              {t("allSet")}
            </h1>
            <p className="mt-1.5 wiz-body text-[#7A7A7A]">
              {currentBusiness
                ? t("joinedAs", { business: currentBusiness.name })
                : t("setupComplete")}
            </p>
          </div>

          {/* App download module — subtle paper surface, not a floating white
              card. Primary action of the page. */}
          <section className="mt-8 rounded-2xl border border-[var(--card-border)] bg-[var(--paper)] p-5 animate-slide-up delay-80 min-[768px]:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-light)] text-[var(--accent)]">
                <DeviceMobileIcon size={18} weight="bold" />
              </span>
              <div>
                <p className="wiz-body-sm font-semibold text-[var(--foreground)]">
                  {t("downloadApp")}
                </p>
                <p className="mt-0.5 wiz-helper text-[#7A7A7A]">
                  {t("downloadDescription")}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-row items-center justify-center gap-2.5 min-[420px]:gap-3">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("appStoreAlt")}
                className="inline-block rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
              >
                <Image
                  src={appleSrc}
                  alt={t("appStoreAlt")}
                  width={156}
                  height={52}
                  className="h-10 w-auto min-[420px]:h-12 sm:h-[52px]"
                />
              </a>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("googlePlayAlt")}
                className="inline-block rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
              >
                <Image
                  src={googleSrc}
                  alt={t("googlePlayAlt")}
                  width={176}
                  height={52}
                  className="h-10 w-auto min-[420px]:h-12 sm:h-[52px]"
                />
              </a>
            </div>

            {scanUrl && (
              <div className="mt-4 text-center">
                <a
                  href={scanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 wiz-helper text-[#7A7A7A] underline-offset-4 transition-colors hover:text-[var(--foreground)] hover:underline"
                >
                  {t("continueInBrowser")}
                  <ArrowSquareOutIcon size={13} weight="bold" />
                </a>
              </div>
            )}
          </section>

          {/* How it works — orients a first-time scanner on what happens next */}
          <section className="mt-8 animate-slide-up delay-160">
            <p className="wiz-helper font-semibold uppercase tracking-wider text-[#999]">
              {t("stepsTitle")}
            </p>
            <ol className="mt-3 flex flex-col gap-3">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-light)] text-[12px] font-bold text-[var(--accent)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="wiz-body-sm font-semibold leading-tight text-[var(--foreground)]">
                      {step.title}
                    </p>
                    <p className="mt-0.5 wiz-helper text-[#7A7A7A]">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-10 text-center animate-slide-up delay-240">
            <button
              type="button"
              onClick={() => signOut()}
              className="wiz-helper font-medium text-[#999] transition-colors hover:text-[var(--foreground)]"
            >
              {tAuth("signOut")}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
