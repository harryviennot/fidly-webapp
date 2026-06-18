'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@/api/profile';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/locale';

/**
 * Compact language cycle button mirrored from the showcase header. Sits in the
 * top-right of the wizard progress bar so an owner who landed on the wrong
 * language can switch with one tap. With three locales it cycles through them
 * (en -> fr -> es -> en); the label shows the language you'll switch to next.
 *
 * Avoids the `window.location.reload()` flash by writing the cookie
 * directly and calling `router.refresh()` — Next.js re-runs the server
 * `i18n/request.ts` with the new cookie and pipes fresh messages down
 * through `NextIntlClientProvider` without unloading the page. The
 * `updateProfile` call is fire-and-forget so persistence doesn't block
 * the visual switch.
 */
export function WizardLanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const currentIdx = SUPPORTED_LOCALES.indexOf(locale);
  const nextLocale: Locale = SUPPORTED_LOCALES[(currentIdx + 1) % SUPPORTED_LOCALES.length];
  const label = nextLocale.toUpperCase();

  const handleSwitch = () => {
    // Cookie + localStorage write — cookie is what `i18n/request.ts` reads
    // server-side, localStorage is a client-side mirror for non-SSR contexts.
    document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    try {
      localStorage.setItem('NEXT_LOCALE', nextLocale);
    } catch {
      /* localStorage may be unavailable in private modes */
    }
    // Persist to the user row in the background. Best-effort only; the
    // cookie is the source of truth for the current session.
    void updateProfile({ locale: nextLocale }).catch(() => {});
    // Re-render server components with the new cookie. Smoother than a
    // full page reload — no white flash, no scroll reset, no remount.
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSwitch}
      aria-label={`Switch to ${nextLocale.toUpperCase()}`}
      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--paper-hover)] transition-colors"
    >
      {label}
    </button>
  );
}
