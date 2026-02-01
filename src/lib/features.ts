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
 * Get a specific limit value for a tier.
 * @param tier - The subscription tier
 * @param limitName - The limit key (e.g., 'max_card_designs')
 * @returns The limit value, or null if unlimited
 */
export function getLimit(
  tier: SubscriptionTier | string,
  limitName: keyof Omit<PlanLimits, "features">
): number | null {
  return getPlanLimits(tier)[limitName];
}

/**
 * Human-readable feature labels for UI display.
 */
export const FEATURE_LABELS: Record<
  string,
  { name: string; description: string }
> = {
  basic_analytics: {
    name: "Basic Analytics",
    description: "Customer counts, scan totals, and redemption stats",
  },
  advanced_analytics: {
    name: "Advanced Analytics",
    description: "Trends, peak times, customer frequency, and retention metrics",
  },
  standard_notifications: {
    name: "Standard Notifications",
    description: "Automatic stamp and reward notifications",
  },
  custom_notifications: {
    name: "Custom Notifications",
    description: "Personalized push notification messages",
  },
  scheduled_campaigns: {
    name: "Scheduled Campaigns",
    description: "Schedule card design changes and promotions",
  },
  multiple_locations: {
    name: "Multiple Locations",
    description: "Manage loyalty programs across multiple store locations",
  },
  geofencing: {
    name: "Geofencing",
    description: "Location-based notifications when customers are nearby",
  },
  promotional_messaging: {
    name: "Promotional Messaging",
    description: "Send promotional messages to all customers",
  },
};

/**
 * API error codes for subscription-related errors.
 */
export const SUBSCRIPTION_ERROR_CODES = {
  LIMIT_EXCEEDED: "LIMIT_EXCEEDED",
  FEATURE_NOT_AVAILABLE: "FEATURE_NOT_AVAILABLE",
} as const;

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

/**
 * Type guard to check if an API error is a feature not available error.
 */
export function isFeatureNotAvailableError(
  error: unknown
): error is {
  detail: {
    code: "FEATURE_NOT_AVAILABLE";
    feature: string;
    message: string;
  };
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof (error as { detail?: { code?: string } }).detail?.code === "string" &&
    (error as { detail: { code: string } }).detail.code ===
      "FEATURE_NOT_AVAILABLE"
  );
}
