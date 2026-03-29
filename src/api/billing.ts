import { API_BASE_URL, getAuthHeaders } from "./client";

export interface BillingStatus {
  tier: string;
  billing_status: string;
  is_founding_partner: boolean;
  is_reseller: boolean;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  days_remaining: number | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  billing_period_end: string | null;
  cancelled_at: string | null;
  amount: number | null;
  currency: string;
}

export async function getBillingStatus(
  businessId: string
): Promise<BillingStatus> {
  const response = await fetch(
    `${API_BASE_URL}/billing/${businessId}/status`,
    { headers: await getAuthHeaders() }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch billing status");
  }

  return response.json();
}

export async function createCheckoutSession(
  businessId: string,
  tier: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ checkout_url: string }> {
  const response = await fetch(
    `${API_BASE_URL}/billing/${businessId}/checkout`,
    {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        tier,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to create checkout session");
  }

  return response.json();
}

export async function createPortalSession(
  businessId: string
): Promise<{ portal_url: string }> {
  const response = await fetch(
    `${API_BASE_URL}/billing/${businessId}/portal`,
    {
      method: "POST",
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to create portal session");
  }

  return response.json();
}

export async function changeTier(
  businessId: string,
  tier: string
): Promise<{ status: string; tier: string }> {
  const response = await fetch(
    `${API_BASE_URL}/billing/${businessId}/change-tier`,
    {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ tier }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to change tier");
  }

  return response.json();
}

export async function cancelSubscription(
  businessId: string
): Promise<{ status: string }> {
  const response = await fetch(
    `${API_BASE_URL}/billing/${businessId}/cancel`,
    {
      method: "POST",
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to cancel subscription");
  }

  return response.json();
}

export async function reactivateSubscription(
  businessId: string
): Promise<{ status: string }> {
  const response = await fetch(
    `${API_BASE_URL}/billing/${businessId}/reactivate`,
    {
      method: "POST",
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to reactivate subscription");
  }

  return response.json();
}
