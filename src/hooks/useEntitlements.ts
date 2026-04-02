/**
 * Hook for checking subscription entitlements.
 *
 * Reads feature configuration from the FeaturesContext (fetched from
 * GET /config/features) and combines it with the current business's
 * tier and billing status to derive effective access.
 */
import { useBusiness } from "@/contexts/business-context";
import { useFeatures, getFeatureValue } from "@/contexts/features-context";

export type SubscriptionTier = "starter" | "growth" | "pro";

export interface EntitlementsResult {
  /** Current subscription tier */
  tier: SubscriptionTier;
  /** Whether the business is suspended (needs billing) */
  isSuspended: boolean;
  /** Whether features config has loaded from the API */
  isLoaded: boolean;
  /** Check if a boolean feature is enabled */
  hasFeature: (key: string) => boolean;
  /** Get a numeric limit (null = unlimited) */
  getLimit: (key: string) => number | null;
  /** Get a feature's raw value (bool, number, string, or null) */
  getValue: (key: string) => boolean | number | string | null | undefined;
  /** Check if a new design can be created given current count */
  canCreateDesign: (currentCount: number) => boolean;
  /** Check if a new team member can be added given current count */
  canAddMember: (currentCount: number) => boolean;
  /** Get remaining designs allowed (null if unlimited) */
  getDesignsRemaining: (currentCount: number) => number | null;
  /** Get remaining team member slots (null if unlimited) */
  getMembersRemaining: (currentCount: number) => number | null;
  /** Check if at design limit */
  isAtDesignLimit: (currentCount: number) => boolean;
  /** Check if at team member limit */
  isAtMemberLimit: (currentCount: number) => boolean;
}

export function useEntitlements(): EntitlementsResult {
  const { currentBusiness } = useBusiness();
  const config = useFeatures();

  const tier = (currentBusiness?.subscription_tier || "starter") as SubscriptionTier;
  const billingStatus = currentBusiness?.billing_status || "trial";
  const isSuspended = billingStatus === "suspended";
  const isLoaded = config !== null;

  const getValue = (key: string) => getFeatureValue(config, tier, key);

  const hasFeature = (key: string): boolean => {
    if (isSuspended) return false;
    const val = getValue(key);
    if (val === undefined) return false;
    if (val === null) return true; // null = unlimited for limits
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val > 0;
    return true; // string values = feature exists
  };

  const getLimit = (key: string): number | null => {
    const val = getValue(key);
    if (val === null || val === undefined) return null;
    if (typeof val === "number") return val;
    return null;
  };

  const canCheck = (key: string, current: number): boolean => {
    if (isSuspended) return false;
    const limit = getLimit(key);
    return limit === null || current < limit;
  };

  const getRemaining = (key: string, current: number): number | null => {
    const limit = getLimit(key);
    if (limit === null) return null;
    return Math.max(0, limit - current);
  };

  const isAtLimit = (key: string, current: number): boolean => {
    const limit = getLimit(key);
    return limit !== null && current >= limit;
  };

  return {
    tier,
    isSuspended,
    isLoaded,
    hasFeature,
    getLimit,
    getValue,
    canCreateDesign: (count) => canCheck("designs.max_active", count),
    canAddMember: (count) => canCheck("team.max_members", count),
    getDesignsRemaining: (count) => getRemaining("designs.max_active", count),
    getMembersRemaining: (count) => getRemaining("team.max_members", count),
    isAtDesignLimit: (count) => isAtLimit("designs.max_active", count),
    isAtMemberLimit: (count) => isAtLimit("team.max_members", count),
  };
}

/**
 * Simplified hook that combines entitlements with design count.
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
 * Simplified hook that combines entitlements with team member count.
 */
export function useMemberEntitlements(memberCount: number) {
  const entitlements = useEntitlements();

  return {
    ...entitlements,
    canAddMember: entitlements.canAddMember(memberCount),
    membersRemaining: entitlements.getMembersRemaining(memberCount),
    isAtMemberLimit: entitlements.isAtMemberLimit(memberCount),
  };
}
