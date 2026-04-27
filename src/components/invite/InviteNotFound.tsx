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

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
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
          variant="gradient"
          size="xl"
          onClick={() => router.push("/")}
          className="w-full"
        >
          {t("goToDashboard")}
        </Button>
      ) : (
        <div className="space-y-2">
          <Button
            type="button"
            variant="gradient"
            size="xl"
            onClick={() => {
              globalThis.location.href = `${showcaseUrl}/login`;
            }}
            className="w-full"
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
            className="w-full"
          >
            {t("goToHome")}
          </Button>
        </div>
      )}
    </div>
  );
}
