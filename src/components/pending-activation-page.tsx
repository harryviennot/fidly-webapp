"use client";

import { useTranslations } from "next-intl";
import { StampeoLogo } from "@/components/ui/stampeo-logo";
import { useAuth } from "@/contexts/auth-provider";
import { Business } from "@/types";

interface PendingActivationPageProps {
  business: Business;
}

export function PendingActivationPage({ business }: PendingActivationPageProps) {
  const { signOut } = useAuth();
  const t = useTranslations('auth');

  const initials = business.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      {/* Header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StampeoLogo className="w-6 h-6" />
          <span className="text-lg font-bold gradient-text">Stampeo</span>
        </div>
        <button
          onClick={signOut}
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          {t('signOut')}
        </button>
      </div>

      {/* Content */}
      <div className="max-w-md w-full text-center">
        {/* Pulsing indicator */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-[var(--accent)]">
              <span className="text-white font-bold text-xl">{initials}</span>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 animate-pulse" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-3">
          {t('pending.title')}
        </h1>

        <p className="text-[var(--muted-foreground)] mb-2">
          {t('pending.businessReady', { name: business.name })}
        </p>
        <p className="text-[var(--muted-foreground)] text-sm mb-8">
          {t('pending.reviewInfo')}
        </p>

        {/* Status card */}
        <div className="bg-[var(--muted)]/30 rounded-2xl p-5 text-left">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-[var(--foreground)]">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{t('pending.businessCreated')}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--foreground)]">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{t('pending.foundingPartner')}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <svg className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>{t('pending.pendingActivation')}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-[var(--muted-foreground)] mt-6">
          {t('pending.autoUpdate')}
        </p>
      </div>
    </div>
  );
}
