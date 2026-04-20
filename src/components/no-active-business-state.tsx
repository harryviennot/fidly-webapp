"use client";

import { Storefront } from "@phosphor-icons/react";
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
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

      <div className="max-w-md w-full text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-[var(--muted)]">
            <Storefront className="w-10 h-10 text-[var(--muted-foreground)]" weight="regular" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-3">
          {t("noActiveBusiness.title")}
        </h1>

        <p className="text-[var(--muted-foreground)] mb-8">
          {t("noActiveBusiness.description")}
        </p>

        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={handleCreateBusiness}
            className="inline-flex items-center justify-center px-6 py-3 bg-[var(--accent)] text-white font-semibold rounded-full hover:bg-[var(--accent-hover)] transition-colors"
          >
            {t("noActiveBusiness.createBusinessCta")}
          </button>
          <a
            href="mailto:support@stampeo.app"
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {t("noActiveBusiness.contactSupport")}
          </a>
        </div>
      </div>
    </div>
  );
}
