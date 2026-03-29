/**
 * Hook for checking subscription entitlements.
 *
 * Provides convenient methods to check plan limits and feature availability.
 * Uses the business context for subscription tier and can optionally
 * use additional context for usage counts.
 */
import { useBusiness } from "@/contexts/business-context";
import {
  getPlanLimits,
  hasFeature as checkFeature,
  PlanLimits,
  SubscriptionTier,
} from "@/lib/features";

export interface EntitlementsResult {
  /** Current subscription tier */
  tier: SubscriptionTier;
  /** Plan limits for the current tier */
  limits: PlanLimits;
  /** Whether the user is on the Pro plan */
  isPro: boolean;
  /** Whether the business is suspended (needs billing) */
  isSuspended: boolean;
  /** Check if a specific feature is available */
  hasFeature: (feature: string) => boolean;
  /** Check if a new design can be created given current count */
  canCreateDesign: (currentCount: number) => boolean;
  /** Check if a new scanner can be added given current count */
  canAddScanner: (currentCount: number) => boolean;
  /** Get remaining designs allowed (null if unlimited) */
  getDesignsRemaining: (currentCount: number) => number | null;
  /** Get remaining scanners allowed (null if unlimited) */
  getScannersRemaining: (currentCount: number) => number | null;
  /** Check if at design limit */
  isAtDesignLimit: (currentCount: number) => boolean;
  /** Check if at scanner limit */
  isAtScannerLimit: (currentCount: number) => boolean;
}

/**
 * Hook to check subscription entitlements.
 *
 * @example
 * ```tsx
 * function DesignList() {
 *   const { designs } = useLoyaltyProgram();
 *   const { canCreateDesign, isPro, hasFeature } = useEntitlements();
 *
 *   return (
 *     <div>
 *       <Button disabled={!canCreateDesign(designs.length)}>
 *         New Design
 *       </Button>
 *       {hasFeature('geofencing') && <GeofencingSettings />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEntitlements(): EntitlementsResult {
  const { currentBusiness } = useBusiness();

  const tier = (currentBusiness?.subscription_tier || "starter") as SubscriptionTier;
  const limits = getPlanLimits(tier);
  const billingStatus = currentBusiness?.billing_status || "trial";
  const isSuspended = billingStatus === "suspended";

  const canCheck = (max: number | null, current: number) => {
    if (isSuspended) return false;
    return max === null || current < max;
  };

  const getRemaining = (max: number | null, current: number) => {
    if (max === null) return null;
    return Math.max(0, max - current);
  };

  return {
    tier,
    limits,
    isPro: tier === "pro",
    isSuspended,
    hasFeature: (feature: string) => !isSuspended && checkFeature(tier, feature),
    canCreateDesign: (count: number) => canCheck(limits.max_card_designs, count),
    canAddScanner: (count: number) => canCheck(limits.max_scanner_accounts, count),
    getDesignsRemaining: (count: number) => getRemaining(limits.max_card_designs, count),
    getScannersRemaining: (count: number) => getRemaining(limits.max_scanner_accounts, count),
    isAtDesignLimit: (count: number) => limits.max_card_designs !== null && count >= limits.max_card_designs,
    isAtScannerLimit: (count: number) => limits.max_scanner_accounts !== null && count >= limits.max_scanner_accounts,
  };
}

/**
 * Simplified hook that combines entitlements with design count.
 * Use within LoyaltyProgramLayout context.
 */
export function useDesignEntitlements(designCount: number) {
  const entitlements = useEntitlements();

  return {
    ...entitlements,
    canCreateDesign: entitlements.canCreateDesign(designCount),
    designsRemaining: entitlements.getDesignsRemaining(designCount),
    isAtDesignLimit: entitlements.isAtDesignLimit(designCount),
  };
}

/**
 * Simplified hook that combines entitlements with scanner count.
 * Use when you have scanner count available.
 */
export function useScannerEntitlements(scannerCount: number) {
  const entitlements = useEntitlements();

  return {
    ...entitlements,
    canAddScanner: entitlements.canAddScanner(scannerCount),
    scannersRemaining: entitlements.getScannersRemaining(scannerCount),
    isAtScannerLimit: entitlements.isAtScannerLimit(scannerCount),
  };
}
