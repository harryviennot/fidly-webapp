"use client";

import { useTranslations } from "next-intl";
import { UserPlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface EmptyTeamStateProps {
  onInvite: () => void;
}

export function EmptyTeamState({ onInvite }: EmptyTeamStateProps) {
  const t = useTranslations('team.emptyState');

  const ROLES = [
    {
      emoji: "🔑",
      title: t('adminRole'),
      description: t('adminDescription'),
    },
    {
      emoji: "📱",
      title: t('scannerRole'),
      description: t('scannerDescription'),
    },
  ];

  return (
    <div className="flex flex-col items-center text-center py-12 md:py-16 px-5 md:px-10 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--card)]">
      {/* Icon */}
      <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--muted)] mb-5">
        <svg width="36" height="36" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="10" r="5" />
          <path d="M3 28c0-5 4-9 9-9s9 4 9 9" />
          <circle cx="25" cy="12" r="4" />
          <path d="M25 18c4 0 7.5 3 7.5 7" />
          <path d="M27 26v6M24 29h6" stroke="var(--accent)" strokeWidth="2" />
        </svg>
      </div>

      {/* Headline */}
      <h3 className="text-xl font-bold text-[var(--foreground)] mb-1.5">
        {t('title')}
      </h3>
      <p className="text-sm text-[var(--muted-foreground)] max-w-sm leading-relaxed mb-1.5">
        {t('description')}
      </p>
      <p className="text-xs text-[var(--muted-foreground)] opacity-70 mb-6">
        {t('onlyMember')}
      </p>

      {/* CTA */}
      <Button
        onClick={onInvite}
        variant="gradient"
        size="lg"
        className="mb-7"
      >
        <UserPlusIcon className="mr-2 h-4 w-4" />
        {t('inviteFirst')}
      </Button>

      {/* Role cards */}
      <div className="flex flex-wrap justify-center gap-5">
        {ROLES.map((role) => (
          <div
            key={role.title}
            className="flex items-center gap-2 py-2 px-3.5 rounded-lg bg-[var(--cream)] border border-[var(--border)]"
          >
            <span className="text-base">{role.emoji}</span>
            <div className="text-left">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                {role.title}
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)] opacity-70">
                {role.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
