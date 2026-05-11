'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-provider';
import { useBusiness } from '@/contexts/business-context';

/**
 * Minimal layout for the launch wizard. No sidebar, no business switcher —
 * the wizard is a focused, single-task surface.
 *
 * Inverse gate: if the current business already has setup_progress.completed_at
 * set, the wizard is unreachable. Direct URL navigation 302s to /.
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

  return <div className="min-h-[100dvh] bg-[var(--background)]">{children}</div>;
}
