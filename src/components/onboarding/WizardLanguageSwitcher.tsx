'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@/api/profile';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/locale';
import { LanguagePicker } from '@/components/ui/LanguagePicker';

/**
 * Wizard language switcher. Sits in the top-right of the progress bar so an
 * owner who landed on the wrong language can switch in one gesture. The base
 * tile shows the current language; hovering / tapping it grows the picker
 * downward to reveal the others, and choosing one slides it back up to the
 * base position.
 *
 * Switching avoids a `window.location.reload()` flash: we write the cookie
 * directly and call `router.refresh()`, so Next.js re-runs `i18n/request.ts`
 * with the new cookie and pipes fresh messages through `NextIntlClientProvider`
 * without unloading the page. The `updateProfile` call is fire-and-forget so
 * persistence doesn't block the visual switch.
 */
export function WizardLanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();

  const handleSelect = (next: string) => {
    const nextLocale = next as Locale;
    // Cookie is what `i18n/request.ts` reads server-side; localStorage is a
    // client-side mirror for non-SSR contexts.
    document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    try {
      localStorage.setItem('NEXT_LOCALE', nextLocale);
    } catch {
      /* localStorage may be unavailable in private modes */
    }
    // Persist to the user row in the background. Best-effort only.
    void updateProfile({ locale: nextLocale }).catch(() => {});
    // Re-render server components with the new cookie — no white flash, no
    // scroll reset, no remount.
    router.refresh();
  };

  return (
    <LanguagePicker
      direction="down"
      trigger="hover"
      value={locale}
      options={SUPPORTED_LOCALES.map((l) => ({ value: l, label: l.toUpperCase() }))}
      onSelect={handleSelect}
      tileHeight={32}
      tileWidth={44}
      surfaceClassName="rounded-lg border border-[var(--border)] bg-[var(--background)]"
      tileClassName="text-[var(--foreground)] hover:bg-[var(--paper-hover)]"
      selectedTileClassName="bg-[var(--accent)] text-white"
    />
  );
}
