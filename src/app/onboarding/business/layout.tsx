'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-provider';
import { useBusiness } from '@/contexts/business-context';
import { applyTheme, getAccentFromSettings, getBackgroundFromSettings, resetTheme } from '@/utils/theme';

const STAMPEO_BRAND_ACCENT = '#f97316';

/**
 * Minimal layout for the launch wizard. No sidebar, no business switcher —
 * the wizard is a focused, single-task surface.
 *
 * Inverse gate: if the current business already has setup_progress.completed_at
 * set, the wizard is unreachable. Direct URL navigation 302s to /.
 *
 * Theming: the dashboard keeps its native green accent, but the onboarding
 * runs in Stampeo's brand orange so it matches the marketing site the user
 * came from. Once the user picks colors in the design chapter, that step
 * calls `applyTheme(themeColor)` and the wizard chrome updates live — the
 * orange seed below is only the pre-pick default.
 */
export default function OnboardingBusinessLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentBusiness, loading: businessLoading } = useBusiness();

  useEffect(() => {
    if (authLoading || businessLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (currentBusiness?.settings?.setup_progress?.completed_at) {
      router.replace('/');
    }
  }, [authLoading, businessLoading, user, currentBusiness, router]);

  // Apply the wizard's orange theme on mount; reset on unmount so the
  // dashboard's green accent (set in globals.css) takes over after wizard
  // completion. If the business already has saved design colors from a
  // previous visit, those win — the design step's applyTheme on mount also
  // overrides this, but seeding from settings here avoids a flicker on
  // re-entry.
  useEffect(() => {
    const settings = (currentBusiness?.settings ?? {}) as Record<string, unknown>;
    const savedAccent = getAccentFromSettings(settings);
    const savedBg = getBackgroundFromSettings(settings);
    const seedAccent =
      savedAccent && savedAccent.toLowerCase() !== '#f97316'
        ? savedAccent
        : STAMPEO_BRAND_ACCENT;
    applyTheme(seedAccent, savedBg ?? undefined);
    return () => {
      resetTheme();
    };
  }, [currentBusiness?.settings]);

  // Hold render until both auth + business are hydrated so step components
  // see a non-null `currentBusiness` and `setup_progress` from their very
  // first paint. This is the persistence fix for InstallStep (and any other
  // step that reads from `progress.payload`) — the prior race made the UI
  // pop the empty-default state for a frame after re-entry.
  if (authLoading || businessLoading) {
    return <div className="min-h-[100dvh] bg-[var(--background)]" />;
  }

  return <div className="min-h-[100dvh] bg-[var(--background)]">{children}</div>;
}
