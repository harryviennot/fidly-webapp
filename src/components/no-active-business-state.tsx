"use client";

import { Storefront, ArrowRight, EnvelopeSimple } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { StampeoLogo } from "@/components/ui/stampeo-logo";
import { useAuth } from "@/contexts/auth-provider";

export function NoActiveBusinessState() {
  const { signOut } = useAuth();
  const t = useTranslations();
  const tAuth = useTranslations("auth");

  const handleCreateBusiness = async () => {
    const showcaseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";
    await signOut();
    window.location.href = `${showcaseUrl}/onboarding`;
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      {/* Header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <StampeoLogo className="w-6 h-6" />
          <span className="text-lg font-bold gradient-text">Stampeo</span>
        </div>
        <button
          onClick={signOut}
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          {tAuth("signOut")}
        </button>
      </div>

      {/* Card */}
      <div className="paper-card relative z-0 max-w-lg w-full rounded-3xl p-10 text-center animate-slide-up delay-0">
        <div className="mb-6 flex justify-center animate-slide-up delay-80">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]">
            <Storefront size={40} weight="duotone" className="text-[var(--accent)]" />
          </div>
        </div>

        <h1 className="text-[26px] font-bold tracking-tight text-[var(--foreground)] mb-3 animate-slide-up delay-160">
          {t("noActiveBusiness.title")}
        </h1>

        <p className="text-[var(--muted-foreground)] leading-relaxed mb-8 animate-slide-up delay-240 max-w-sm mx-auto">
          {t("noActiveBusiness.description")}
        </p>

        <div className="flex flex-col gap-3 items-center animate-slide-up delay-300">
          <button
            onClick={handleCreateBusiness}
            className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-full hover:bg-[var(--primary-hover)] transition-all shadow-sm hover:shadow-md"
          >
            {t("noActiveBusiness.createBusinessCta")}
            <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <a
            href="mailto:support@stampeo.app"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mt-1"
          >
            <EnvelopeSimple size={14} weight="regular" />
            {t("noActiveBusiness.contactSupport")}
          </a>
        </div>
      </div>
    </div>
  );
}
