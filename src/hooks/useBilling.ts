import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "@/contexts/business-context";
import {
  getBillingStatus,
  createCheckoutSession,
  createPortalSession,
  changeTier,
  cancelSubscription,
  reactivateSubscription,
  type BillingStatus,
} from "@/api/billing";

export const billingKeys = {
  status: (businessId: string) => ["billing", "status", businessId] as const,
};

export function useBillingStatus() {
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;

  const query = useQuery<BillingStatus>({
    queryKey: billingKeys.status(businessId ?? ""),
    queryFn: () => getBillingStatus(businessId!),
    enabled: !!businessId,
    staleTime: 60_000, // 1 minute
  });

  const data = query.data;
  const billingStatus = data?.billing_status ?? "trial";

  const hasSubscription = !!data?.stripe_subscription_id;

  // Use query fetch timestamp as "now" to avoid impure Date.now() calls
  const now = query.dataUpdatedAt || 0;
  const trialEndMs = data?.trial_ends_at ? new Date(data.trial_ends_at).getTime() : null;
  const isActiveInTrial =
    billingStatus === "active" &&
    hasSubscription &&
    trialEndMs !== null &&
    trialEndMs > now;
  const daysUntilFirstCharge = isActiveInTrial && trialEndMs
    ? Math.max(0, Math.ceil((trialEndMs - now) / 86_400_000))
    : null;

  return {
    ...query,
    billingStatus,
    isTrialing: billingStatus === "trial",
    isGrace: billingStatus === "grace",
    isActive: billingStatus === "active",
    isPastDue: billingStatus === "past_due",
    isCancelled: billingStatus === "cancelled",
    isSuspended: billingStatus === "suspended",
    daysRemaining: data?.days_remaining ?? null,
    isFoundingPartner: data?.is_founding_partner ?? false,
    isReseller: data?.is_reseller ?? false,
    hasSubscription,
    isActiveInTrial,
    daysUntilFirstCharge,
  };
}

export function useCheckout() {
  const { currentBusiness } = useBusiness();

  return useMutation({
    mutationFn: async ({
      tier,
      successUrl,
      cancelUrl,
    }: {
      tier: string;
      successUrl: string;
      cancelUrl: string;
    }) => {
      if (!currentBusiness?.id) throw new Error("No business selected");
      const result = await createCheckoutSession(
        currentBusiness.id,
        tier,
        successUrl,
        cancelUrl
      );
      // Redirect to Stripe Checkout
      window.location.href = result.checkout_url;
      return result;
    },
  });
}

export function usePortalSession() {
  const { currentBusiness } = useBusiness();

  return useMutation({
    mutationFn: async () => {
      if (!currentBusiness?.id) throw new Error("No business selected");
      const result = await createPortalSession(currentBusiness.id);
      window.location.href = result.portal_url;
      return result;
    },
  });
}

export function useChangeTier() {
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tier: string) => {
      if (!currentBusiness?.id) throw new Error("No business selected");
      return changeTier(currentBusiness.id, tier);
    },
    onSuccess: () => {
      if (currentBusiness?.id) {
        queryClient.invalidateQueries({
          queryKey: billingKeys.status(currentBusiness.id),
        });
        queryClient.invalidateQueries({ queryKey: ["business"] });
      }
    },
  });
}

export function useCancelSubscription() {
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!currentBusiness?.id) throw new Error("No business selected");
      return cancelSubscription(currentBusiness.id);
    },
    onSuccess: () => {
      if (currentBusiness?.id) {
        queryClient.invalidateQueries({
          queryKey: billingKeys.status(currentBusiness.id),
        });
      }
    },
  });
}

export function useReactivateSubscription() {
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!currentBusiness?.id) throw new Error("No business selected");
      return reactivateSubscription(currentBusiness.id);
    },
    onSuccess: () => {
      if (currentBusiness?.id) {
        queryClient.invalidateQueries({
          queryKey: billingKeys.status(currentBusiness.id),
        });
      }
    },
  });
}
