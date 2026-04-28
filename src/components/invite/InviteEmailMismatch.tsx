"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import type { InvitationPublic } from "@/types";

interface InviteEmailMismatchProps {
  invitation: InvitationPublic;
  currentEmail: string;
}

export function InviteEmailMismatch({
  invitation,
  currentEmail,
}: InviteEmailMismatchProps) {
  const t = useTranslations("auth.invite.emailMismatch");
  const [switching, setSwitching] = useState(false);

  const handleSwitchAccount = async () => {
    setSwitching(true);
    const here = window.location.href;
    const supabase = createClient();
    await supabase.auth.signOut();
    const showcaseUrl =
      process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";
    const params = new URLSearchParams({
      email: invitation.email,
      redirect: here,
    });
    window.location.href = `${showcaseUrl}/login?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <WarningCircleIcon size={20} weight="fill" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      </div>

      <div className="rounded-xl border border-[var(--card-border)] bg-muted/30 p-4 space-y-2 text-sm">
        <p>{t("sentTo", { email: invitation.email })}</p>
        <p className="text-muted-foreground">
          {t("signedInAs", { email: currentEmail })}
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <p className="font-medium">
          {t("options", { business: invitation.business_name })}
        </p>
        <ul className="space-y-2 text-muted-foreground pl-1">
          <li className="flex gap-2">
            <span className="mt-0.5">•</span>
            <span>{t("askResend", { inviter: invitation.inviter_name })}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5">•</span>
            <span>{t("orSignInAs")}</span>
          </li>
        </ul>
      </div>

      <Button
        type="button"
        variant="gradient"
        size="xl"
        onClick={handleSwitchAccount}
        disabled={switching}
        className="w-full"
      >
        {t("switchAccount")}
      </Button>
    </div>
  );
}
