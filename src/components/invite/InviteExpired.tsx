"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ClockIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { InvitationPublic } from "@/types";

interface InviteExpiredProps {
  invitation: InvitationPublic;
  isAuthenticated: boolean;
}

export function InviteExpired({ invitation, isAuthenticated }: InviteExpiredProps) {
  const t = useTranslations("auth.invite");
  const router = useRouter();

  const showcaseUrl =
    process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
        <ClockIcon size={24} weight="fill" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("expired.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("expired.body", {
            inviter: invitation.inviter_name,
            business: invitation.business_name,
          })}
        </p>
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
      )}
    </div>
  );
}
