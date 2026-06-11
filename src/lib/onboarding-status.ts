import type { Business } from "@/types";

/** Card-upfront businesses get this many days of mid-wizard use before
 * checkout becomes mandatory. Mirrors backend CHECKOUT_SETUP_WINDOW_DAYS
 * (app/services/billing.py) — keep the two in sync. See STA-215. */
export const CHECKOUT_SETUP_WINDOW_DAYS = 30;

/**
 * Whether a business has fully completed onboarding and may enter the dashboard.
 *
 * - Legacy (no-card) businesses: complete once the wizard sets
 *   `setup_progress.completed_at`.
 * - Card-upfront businesses (STA-173/215): completing all wizard steps is not
 *   enough — the plan step hands off to Stripe Checkout, so "set up" also
 *   requires a paid subscription. A business still parked in
 *   `billing_status='pending_checkout'` is never set up (the webhook flips it
 *   to `trial`/`active` on payment), so the dashboard bounces them back to the
 *   wizard's plan step to finish paying (no separate paywall screen).
 */
export function isBusinessSetupComplete(
  business:
    | Pick<
        Business,
        "requires_card_upfront" | "stripe_subscription_id" | "billing_status" | "settings"
      >
    | null
    | undefined
): boolean {
  if (!business) return false;
  if (!business.settings?.setup_progress?.completed_at) return false;
  // A card-upfront business that never finished Stripe Checkout is still parked
  // in pending_checkout. Keying on billing_status (flipped by the Stripe
  // webhook on payment) is the robust signal — covers any path where
  // stripe_subscription_id is briefly set before the status flips.
  if (business.billing_status === "pending_checkout") return false;
  if (business.requires_card_upfront && !business.stripe_subscription_id) return false;
  return true;
}

/**
 * Whether a card-upfront business has burned through its free setup window
 * without ever reaching/finishing checkout: parked in `pending_checkout`, no
 * `completed_at`, and signed up more than CHECKOUT_SETUP_WINDOW_DAYS ago.
 *
 * The owner is still mid-wizard, but the backend now gates the operational
 * routes the wizard's optional demo chapters use (first stamp, test broadcast,
 * team invite). Rather than let those steps error, the dashboard sends the
 * owner straight to the plan step to pay — they can finish the rest after.
 */
export function isCheckoutSetupWindowLapsed(
  business:
    | Pick<Business, "billing_status" | "created_at" | "settings">
    | null
    | undefined
): boolean {
  if (!business) return false;
  if (business.billing_status !== "pending_checkout") return false;
  if (business.settings?.setup_progress?.completed_at) return false;
  if (!business.created_at) return false;
  const created = new Date(business.created_at).getTime();
  if (Number.isNaN(created)) return false;
  const cutoff = Date.now() - CHECKOUT_SETUP_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return created < cutoff;
}
