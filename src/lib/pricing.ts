/**
 * Centralised pricing source of truth for the web app's onboarding plan step.
 * Ported from the showcase landing site so prices stay consistent across
 * marketing and the in-app picker.
 *
 * Change prices here; consumers read directly. The `FOUNDING_PROGRAM_END_DATE`
 * constant mirrors the backend (`app/core/stripe_config.py`) — keep both in
 * sync if the program window ever shifts.
 */

export const PRICING = {
  starter: {
    price: 20,
    foundingPrice: 10,
  },
  growth: {
    price: 40,
    foundingPrice: 20,
  },
  pro: {
    price: 60,
    // No founding tier — Pro is full-price only.
  },
  /** Founding partner discount percentage (Starter + Growth only). */
  foundingDiscount: 50,
  /** Free months for founding partners (used in marketing copy). */
  freeMonths: 3,
} as const;

export type TierId = 'starter' | 'growth' | 'pro';

/**
 * Founding partner program closes at this instant (UTC). After this moment:
 *   - new business rows are inserted with `is_founding_partner=false`
 *   - the plan picker drops the strikethrough discount, "/mo for life" copy,
 *     and the FoundingCountdown
 * Existing founding partners are grandfathered server-side via the DB flag.
 */
export const FOUNDING_PROGRAM_END_DATE = new Date(
  Date.UTC(2026, 6, 21, 23, 59, 59) // month is 0-indexed → 6 = July
);

export function isFoundingProgramOpen(now: Date = new Date()): boolean {
  return now < FOUNDING_PROGRAM_END_DATE;
}

/** Format a number for display (no thousand separators; locale-aware decimals). */
export function formatPrice(price: number, locale?: string): string {
  if (locale === 'fr') {
    return price % 1 === 0 ? `${price}` : price.toFixed(2).replace('.', ',');
  }
  return price % 1 === 0 ? `${price}` : price.toFixed(2);
}

/**
 * Return the price a given business pays for a tier right now: founding
 * price if the business is a founding partner AND the program is open AND
 * the tier offers a founding price; otherwise the regular price.
 */
export function effectivePrice(
  tier: TierId,
  isFoundingPartner: boolean,
  now: Date = new Date()
): { displayPrice: number; regularPrice: number; isFoundingDiscount: boolean } {
  const tierConfig = PRICING[tier];
  const regularPrice = tierConfig.price;
  const hasFoundingPrice = 'foundingPrice' in tierConfig;
  if (isFoundingPartner && isFoundingProgramOpen(now) && hasFoundingPrice) {
    return {
      displayPrice: tierConfig.foundingPrice,
      regularPrice,
      isFoundingDiscount: true,
    };
  }
  return { displayPrice: regularPrice, regularPrice, isFoundingDiscount: false };
}
