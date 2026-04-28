"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircleIcon, InfoIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import type { InvitationPublic } from "@/types";

interface InviteAlreadyAcceptedProps {
  invitation: InvitationPublic;
  variant: "by-me" | "by-other";
  isAuthenticated: boolean;
}

export function InviteAlreadyAccepted({
  invitation,
  variant,
  isAuthenticated,
}: InviteAlreadyAcceptedProps) {
  const t = useTranslations("auth.invite");
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const handleSignInAsInvited = async () => {
    setSwitching(true);
    const here = globalThis.location.href;
    if (isAuthenticated) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    const showcaseUrl =
      process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";
    const params = new URLSearchParams({
      email: invitation.email,
      redirect: here,
    });
    globalThis.location.href = `${showcaseUrl}/login?${params.toString()}`;
  };

  if (variant === "by-me") {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-foreground">
          <CheckCircleIcon size={24} weight="fill" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            {t("alreadyAcceptedByMe.title", {
              business: invitation.business_name,
            })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("alreadyAcceptedByMe.body")}
          </p>
        </div>
        <Button
          type="button"
          variant="gradient"
          size="xl"
          onClick={() => router.push("/")}
          className="w-full"
        >
          {t("goToDashboard")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
        <InfoIcon size={24} weight="fill" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("alreadyAcceptedByOther.title")}
        </h1>
        <p className="text-sm">
          {t("alreadyAcceptedByOther.body", { email: invitation.email })}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("alreadyAcceptedByOther.instructions", {
            business: invitation.business_name,
          })}
        </p>
      </div>
      <Button
        type="button"
        variant="gradient"
        size="xl"
        onClick={handleSignInAsInvited}
        disabled={switching}
        className="w-full"
      >
        {t("alreadyAcceptedByOther.cta")}
      </Button>
    </div>
  );
}
