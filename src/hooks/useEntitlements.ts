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

  const tier = (currentBusiness?.subscription_tier || "pay") as SubscriptionTier;
  const limits = getPlanLimits(tier);

  const canCreateDesign = (currentCount: number): boolean => {
    if (limits.max_card_designs === null) return true;
    return currentCount < limits.max_card_designs;
  };

  const canAddScanner = (currentCount: number): boolean => {
    if (limits.max_scanner_accounts === null) return true;
    return currentCount < limits.max_scanner_accounts;
  };

  const getDesignsRemaining = (currentCount: number): number | null => {
    if (limits.max_card_designs === null) return null;
    return Math.max(0, limits.max_card_designs - currentCount);
  };

  const getScannersRemaining = (currentCount: number): number | null => {
    if (limits.max_scanner_accounts === null) return null;
    return Math.max(0, limits.max_scanner_accounts - currentCount);
  };

  const isAtDesignLimit = (currentCount: number): boolean => {
    if (limits.max_card_designs === null) return false;
    return currentCount >= limits.max_card_designs;
  };

  const isAtScannerLimit = (currentCount: number): boolean => {
    if (limits.max_scanner_accounts === null) return false;
    return currentCount >= limits.max_scanner_accounts;
  };

  return {
    tier,
    limits,
    isPro: tier === "pro",
    hasFeature: (feature: string) => checkFeature(tier, feature),
    canCreateDesign,
    canAddScanner,
    getDesignsRemaining,
    getScannersRemaining,
    isAtDesignLimit,
    isAtScannerLimit,
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
