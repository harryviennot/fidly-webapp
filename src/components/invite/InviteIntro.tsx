"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EnvelopeSimpleIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form/form-field";
import type { InvitationPublic } from "@/types";

interface InviteIntroProps {
  invitation: InvitationPublic;
  initialName?: string;
  onContinue: (name: string) => void;
}

export function InviteIntro({ invitation, initialName, onContinue }: InviteIntroProps) {
  const t = useTranslations("auth.invite");
  const [name, setName] = useState(initialName || invitation.name || "");

  const trimmedName = name.trim();
  const canContinue = trimmedName.length > 0;

  const roleLabel =
    invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("step1.title", { business: invitation.business_name })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("step1.subtitle", { inviter: invitation.inviter_name })}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--card-border)] p-4 space-y-3">
        <div className="flex justify-between items-start gap-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("role")}
          </span>
          <div className="text-right">
            <span className="font-medium text-sm">{roleLabel}</span>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px]">
              {t(`roleDescriptions.${invitation.role}`)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--card-border)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <EnvelopeSimpleIcon size={14} />
            {t("step1.emailLabel")}
          </div>
          <LockSimpleIcon
            size={14}
            className="text-muted-foreground"
            aria-label="locked"
          />
        </div>
        <p className="mt-2 font-medium text-sm break-all">{invitation.email}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("step1.emailHint")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("step1.emailHintSwitch", { inviter: invitation.inviter_name })}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canContinue) onContinue(trimmedName);
        }}
        className="space-y-4"
      >
        <FormField
          label={t("step1.nameLabel")}
          id="invite-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("step1.namePlaceholder")}
          autoComplete="name"
          required
          autoFocus
        />

        <Button
          type="submit"
          disabled={!canContinue}
          variant="gradient"
          size="xl"
          className="w-full"
        >
          {t("step1.continue")}
        </Button>
      </form>
    </div>
  );
}
