/**
 * The business has no explicit currency column, so we derive a display symbol
 * from its operating country (falling back to the primary locale, then €). This
 * is purely cosmetic — used to frame the points earn-rate ("1 € spent = N
 * points"). Accrual itself is currency-agnostic on the backend.
 */
const COUNTRY_SYMBOL: Record<string, string> = {
  GB: '£', US: '$', CA: '$', AU: '$', NZ: '$', CH: 'CHF',
  // Eurozone + the locales we ship default to €.
  FR: '€', ES: '€', DE: '€', IT: '€', PT: '€', BE: '€', NL: '€', IE: '€',
};

const LOCALE_SYMBOL: Record<string, string> = {
  en: '£', fr: '€', es: '€',
};

export function currencySymbol(
  country?: string | null,
  locale?: string | null
): string {
  if (country && COUNTRY_SYMBOL[country.toUpperCase()]) {
    return COUNTRY_SYMBOL[country.toUpperCase()];
  }
  if (locale && LOCALE_SYMBOL[locale]) return LOCALE_SYMBOL[locale];
  return '€';
}
