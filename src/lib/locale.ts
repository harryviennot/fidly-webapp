export const SUPPORTED_LOCALES = ["en", "fr"] as const;
export const DEFAULT_LOCALE = "en";

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function setLocale(locale: Locale) {
  // Set cookie with 1-year expiry
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
  // Also store in localStorage for client-side access
  localStorage.setItem("NEXT_LOCALE", locale);
  // Full reload so the server re-reads the cookie in i18n/request.ts
  window.location.reload();
}
