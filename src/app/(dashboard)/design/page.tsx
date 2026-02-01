'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy route - redirects to the new Loyalty Program page
 * The design editor routes (/design/[id], /design/new) still work independently
 */
export default function DesignListPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/loyalty-program');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
    </div>
  );
}
