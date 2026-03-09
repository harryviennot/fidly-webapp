/**
 * Feature definitions and plan limits.
 * Mirrors backend/app/core/features.py - keep in sync!
 *
 * This module defines what each subscription tier can access:
 * - Usage limits (max designs, max scanners)
 * - Feature flags (scheduling, geofencing, etc.)
 */

export type SubscriptionTier = "pay" | "pro";

export interface PlanLimits {
  max_card_designs: number | null; // null = unlimited
  max_scanner_accounts: number | null; // null = unlimited
  features: string[];
}

/**
 * Plan configuration - edit here to change limits.
 * IMPORTANT: Keep in sync with backend/app/core/features.py
 */
export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  pay: {
    max_card_designs: 1,
    max_scanner_accounts: 3,
    features: ["basic_analytics", "standard_notifications"],
  },
  pro: {
    max_card_designs: null, // unlimited
    max_scanner_accounts: null, // unlimited
    features: [
      "basic_analytics",
      "advanced_analytics",
      "standard_notifications",
      "custom_notifications",
      "scheduled_campaigns",
      "multiple_locations",
      "geofencing",
      "promotional_messaging",
    ],
  },
};

/**
 * Get limits for a subscription tier.
 * @param tier - The subscription tier ('pay' or 'pro')
 * @returns PlanLimits for the tier, defaults to 'pay' if unknown
 */
export function getPlanLimits(tier: SubscriptionTier | string): PlanLimits {
  return PLAN_LIMITS[tier as SubscriptionTier] || PLAN_LIMITS.pay;
}

/**
 * Check if a tier has access to a specific feature.
 * @param tier - The subscription tier
 * @param feature - The feature flag name to check
 * @returns true if the feature is available
 */
export function hasFeature(
  tier: SubscriptionTier | string,
  feature: string
): boolean {
  return getPlanLimits(tier).features.includes(feature);
}

/**
 * Type guard to check if an API error is a limit exceeded error.
 */
export function isLimitExceededError(
  error: unknown
): error is {
  detail: {
    code: "LIMIT_EXCEEDED";
    resource: string;
    limit: number;
    current: number;
    message: string;
  };
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof (error as { detail?: { code?: string } }).detail?.code === "string" &&
    (error as { detail: { code: string } }).detail.code === "LIMIT_EXCEEDED"
  );
}

