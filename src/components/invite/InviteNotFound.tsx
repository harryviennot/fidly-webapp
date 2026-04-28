"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { XCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface InviteNotFoundProps {
  isAuthenticated: boolean;
}

export function InviteNotFound({ isAuthenticated }: InviteNotFoundProps) {
  const t = useTranslations("auth.invite");
  const router = useRouter();

  const showcaseUrl =
    process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";

  // No business context here (token doesn't resolve), so we don't theme on
  // a business accent — render the action with the neutral primary (#1A1A1A).
  const primaryClass =
    "w-full h-12 rounded-full px-6 text-base bg-primary text-primary-foreground hover:bg-primary/90 font-semibold";

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-foreground flex items-center justify-center text-background">
        <XCircleIcon size={24} weight="fill" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("notFound.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("notFound.body")}</p>
        <p className="text-sm font-medium">{t("notFound.contactOwner")}</p>
      </div>

      {isAuthenticated ? (
        <Button
          type="button"
          onClick={() => router.push("/")}
          className={primaryClass}
        >
          {t("goToDashboard")}
        </Button>
      ) : (
        <div className="space-y-2">
          <Button
            type="button"
            onClick={() => {
              globalThis.location.href = `${showcaseUrl}/login`;
            }}
            className={primaryClass}
          >
            {t("createAccount")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xl"
            onClick={() => {
              globalThis.location.href = showcaseUrl;
            }}
            className="w-full rounded-full"
          >
            {t("goToHome")}
          </Button>
        </div>
      )}
    </div>
  );
}
