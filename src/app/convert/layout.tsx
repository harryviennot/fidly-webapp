'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-provider';
import { useBusiness } from '@/contexts/business-context';
import { isBusinessSetupComplete } from '@/lib/onboarding-status';

/**
 * Full-screen layout for the conversion wizard — no sidebar, single task,
 * mirroring the onboarding wizard's chrome.
 *
 * Gates are the INVERSE of onboarding's: the wizard converts a live program,
 * so it requires a fully set-up business (an unfinished one belongs in
 * onboarding instead) and the owner role (managers/scanners can't restructure
 * the loyalty program). It never touches setup_progress.
 *
 * Theming: unlike onboarding (brand orange), conversion keeps the business's
 * own theme — the owner is already home, just switching program type.
 */
export default function ConvertLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentBusiness, currentRole, loading: businessLoading } = useBusiness();

  useEffect(() => {
    if (authLoading || businessLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!currentBusiness || !isBusinessSetupComplete(currentBusiness)) {
      router.replace('/');
      return;
    }
    if (currentRole !== 'owner') {
      router.replace('/');
    }
  }, [authLoading, businessLoading, user, currentBusiness, currentRole, router]);

  // Hold render until hydrated so steps see a non-null business immediately.
  if (authLoading || businessLoading || !currentBusiness || currentRole !== 'owner') {
    return <div className="min-h-[100dvh] bg-[var(--background)]" />;
  }

  return <div className="min-h-[100dvh] bg-[var(--background)]">{children}</div>;
}
