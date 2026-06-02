import type { Business } from "@/types";

/**
 * Whether a business has fully completed onboarding and may enter the dashboard.
 *
 * - Legacy (no-card) businesses: complete once the wizard sets
 *   `setup_progress.completed_at`.
 * - Card-upfront businesses (STA-173): completing all wizard steps is not
 *   enough — the plan step hands off to Stripe Checkout, so "set up" also
 *   requires a paid subscription. Until `stripe_subscription_id` lands, the
 *   dashboard treats them as still-onboarding and bounces them back to the
 *   wizard's plan step to finish paying (no separate paywall screen).
 */
export function isBusinessSetupComplete(
  business:
    | Pick<Business, "requires_card_upfront" | "stripe_subscription_id" | "settings">
    | null
    | undefined
): boolean {
  if (!business) return false;
  if (!business.settings?.setup_progress?.completed_at) return false;
  if (business.requires_card_upfront && !business.stripe_subscription_id) return false;
  return true;
}
