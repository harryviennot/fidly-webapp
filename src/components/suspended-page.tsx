"use client";

import { StampeoLogo } from "@/components/ui/stampeo-logo";
import { useAuth } from "@/contexts/auth-provider";

export function SuspendedPage() {
  const { signOut } = useAuth();

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
          Sign out
        </button>
      </div>

      {/* Content */}
      <div className="max-w-md w-full text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-red-100 dark:bg-red-950/50">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-3">
          Account Suspended
        </h1>

        <p className="text-[var(--muted-foreground)] mb-8">
          Your business account has been suspended. If you believe this is an error,
          please contact our support team.
        </p>

        <a
          href="mailto:support@stampeo.app"
          className="inline-flex items-center justify-center px-6 py-3 bg-[var(--accent)] text-white font-semibold rounded-full hover:bg-[var(--accent-hover)] transition-colors"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
