/**
 * Pure derivations over a business's billing/trial state.
 *
 * Source-of-truth rule (see backend docs/billing/TRIAL_MANAGEMENT.md): a
 * business with a live `stripe_subscription_id` is Stripe-owned — its trial
 * auto-converts to a paid subscription at trial end. Such a business should see
 * the "first charge in X days" info + a Cancel button, NOT the "subscribe now"
 * trial banner, regardless of whether its local `billing_status` reads `trial`
 * (the card-upfront cohort mid Stripe-trial) or `active` (a legacy mid-trial
 * conversion). A `trial` business WITHOUT a subscription is the no-card cohort
 * that will lapse — it keeps the "subscribe now" banner.
 */

export interface BillingFlagsInput {
  billingStatus: string;
  hasSubscription: boolean;
  trialEndsAt: string | null | undefined;
  /** Fetch timestamp used as "now" (kept impure Date.now() out of this fn). */
  now: number;
}

export interface DerivedBillingFlags {
  isActiveInTrial: boolean;
  daysUntilFirstCharge: number | null;
}

export function deriveTrialSubscriptionFlags(
  input: BillingFlagsInput,
): DerivedBillingFlags {
  const { billingStatus, hasSubscription, trialEndsAt, now } = input;
  const trialEndMs = trialEndsAt ? new Date(trialEndsAt).getTime() : null;
  const isActiveInTrial =
    (billingStatus === "active" || billingStatus === "trial") &&
    hasSubscription &&
    trialEndMs !== null &&
    trialEndMs > now;
  const daysUntilFirstCharge =
    isActiveInTrial && trialEndMs
      ? Math.max(0, Math.ceil((trialEndMs - now) / 86_400_000))
      : null;
  return { isActiveInTrial, daysUntilFirstCharge };
}
