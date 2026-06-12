'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-provider';
import { useBusiness } from '@/contexts/business-context';
import { isBusinessSetupComplete } from '@/lib/onboarding-status';
import { applyTheme, getAccentFromSettings, getBackgroundFromSettings, resetTheme } from '@/utils/theme';

const STAMPEO_BRAND_ACCENT = '#f97316';

/**
 * Minimal layout for the launch wizard. No sidebar, no business switcher —
 * the wizard is a focused, single-task surface.
 *
 * Inverse gate: if the current business is fully set up, the wizard is
 * unreachable and direct URL navigation 302s to /. "Fully set up" means the
 * wizard finished AND — for card-upfront new signups — a subscription exists,
 * so a business that completed every step but hasn't paid stays here on the
 * plan step to finish Stripe Checkout. See isBusinessSetupComplete.
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
  const { currentBusiness, loading: businessLoading, creatingNewBusiness } = useBusiness();

  useEffect(() => {
    if (authLoading || businessLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // The create-another-business flow forces currentBusiness to null, but
    // guard explicitly anyway: a transient frame where the previous (set-up)
    // business is still selected must not bounce the user home.
    if (!creatingNewBusiness && isBusinessSetupComplete(currentBusiness)) {
      router.replace('/');
    }
  }, [authLoading, businessLoading, user, currentBusiness, creatingNewBusiness, router]);

  // NOTE: leaving the wizard mid-flow used to clear `creatingNewBusiness`
  // via an unmount cleanup here — StrictMode double-invoked it on entry and
  // killed the flow. The BusinessProvider now cancels on real navigation
  // away from /onboarding/business instead (pathname-based).

  // Apply the wizard's orange theme on mount. On unmount, hand the theme
  // back to the saved business colors so the dashboard renders the user's
  // accent immediately — the BusinessProvider's theme effect only re-fires
  // when `currentBusiness.id`/`settings` change, and neither changes on
  // wizard → dashboard transition, so a plain `resetTheme()` here would
  // leave the dashboard on defaults until the next reload.
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
      const latest = (currentBusiness?.settings ?? {}) as Record<string, unknown>;
      const accent = getAccentFromSettings(latest);
      const bg = getBackgroundFromSettings(latest);
      if (accent || bg) {
        applyTheme(accent, bg ?? undefined);
      } else {
        resetTheme();
      }
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
