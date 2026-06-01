"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, Check, SpinnerGap } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useBusiness } from "@/contexts/business-context";
import { useAuth } from "@/contexts/auth-provider";
import { createCheckoutSession } from "@/api/billing";
import { effectivePrice, type TierId } from "@/lib/pricing";

const TIERS: readonly TierId[] = ["starter", "growth", "pro"] as const;

/**
 * Full-screen gate for a card-upfront business (STA-173) that finished
 * onboarding but never attached a payment method (closed/abandoned Stripe
 * Checkout). Rendered inline by the dashboard layout — NOT a redirect, because
 * the onboarding wizard 302s away once setup is complete, so bouncing back
 * into it would loop. The owner picks/confirms a plan and is sent to Stripe.
 *
 * When the user returns from a successful checkout (`?checkout=success`), the
 * subscription webhook may not have landed yet. We poll memberships for a short
 * window and show a "finalizing" state instead of asking them to pay again.
 */
export function CheckoutRequiredPage() {
  const t = useTranslations("auth");
  const tp = useTranslations("pricing");
  const tAuth = useTranslations("auth");
  const { currentBusiness, refetch } = useBusiness();
  const { signOut } = useAuth();

  const businessId = currentBusiness?.id;
  const isFoundingPartner = !!currentBusiness?.is_founding_partner;
  const [selectedTier, setSelectedTier] = useState<TierId>(() => {
    const t0 = currentBusiness?.subscription_tier;
    return t0 === "starter" || t0 === "pro" ? t0 : "growth";
  });
  const [submitting, setSubmitting] = useState(false);

  // Did we just come back from a completed Stripe Checkout? Read once at mount
  // (client only) so we don't need a Suspense boundary for useSearchParams.
  const [awaitingWebhook, setAwaitingWebhook] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("checkout") === "success";
  });

  // Poll memberships while we wait for the subscription webhook. Once
  // stripe_subscription_id lands, the layout's gate clears and this whole
  // component unmounts — so we just keep refetching, then give up after ~24s
  // and fall back to the normal checkout UI in case the webhook never arrived.
  const attemptsRef = useRef(0);
  useEffect(() => {
    if (!awaitingWebhook) return;
    const id = setInterval(() => {
      attemptsRef.current += 1;
      if (attemptsRef.current > 12) {
        setAwaitingWebhook(false);
        clearInterval(id);
        return;
      }
      void refetch();
    }, 2000);
    return () => clearInterval(id);
  }, [awaitingWebhook, refetch]);

  const startCheckout = useCallback(async () => {
    if (!businessId || submitting) return;
    setSubmitting(true);
    try {
      const origin = window.location.origin;
      const { checkout_url } = await createCheckoutSession(
        businessId,
        selectedTier,
        `${origin}/?checkout=success`,
        `${origin}/?checkout=cancelled`
      );
      window.location.href = checkout_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("checkoutRequired.error"));
      setSubmitting(false);
    }
  }, [businessId, selectedTier, submitting, t]);

  if (awaitingWebhook) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
        <div className="text-center">
          <SpinnerGap size={40} className="mx-auto animate-spin text-[var(--accent)]" />
          <h1 className="mt-6 text-xl font-semibold text-[var(--foreground)]">
            {t("checkoutRequired.finalizingTitle")}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {t("checkoutRequired.finalizingBody")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
      <Card hover={false} className="w-full max-w-md p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-light)]/50">
            <CreditCard size={32} weight="duotone" className="text-[var(--accent)]" />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {t("checkoutRequired.title")}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[var(--muted-foreground)]">
          {t("checkoutRequired.description")}
        </p>

        <p className="mt-6 mb-2 text-left text-[11px] font-extrabold uppercase tracking-widest text-[var(--muted-foreground)]">
          {t("checkoutRequired.planLabel")}
        </p>
        <div className="flex flex-col gap-2">
          {TIERS.map((tier) => {
            const { displayPrice, regularPrice, isFoundingDiscount } = effectivePrice(
              tier,
              isFoundingPartner
            );
            const isSelected = selectedTier === tier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                disabled={submitting}
                className={cn(
                  "flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors",
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent-light)]/30"
                    : "border-[var(--border)] hover:border-[var(--foreground)]/30"
                )}
              >
                <span className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
                  {isSelected && <Check size={16} weight="bold" className="text-[var(--accent)]" />}
                  {tp(`${tier}.name`)}
                </span>
                <span className="flex items-baseline gap-1">
                  {isFoundingDiscount && (
                    <span className="text-xs text-[var(--muted-foreground)] line-through tabular-nums">
                      €{regularPrice}
                    </span>
                  )}
                  <span className="font-bold tabular-nums text-[var(--foreground)]">
                    €{displayPrice}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {isFoundingDiscount ? tp("forLife") : tp("perMonth")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={startCheckout}
          disabled={submitting || !businessId}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-[var(--accent-hover)] hover:shadow-md disabled:opacity-60"
        >
          {submitting ? (
            <SpinnerGap size={18} className="animate-spin" />
          ) : (
            <CreditCard size={18} weight="bold" />
          )}
          {t("checkoutRequired.cta")}
        </button>

        <p className="mt-4 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
          {t("checkoutRequired.trust")}
        </p>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-6 text-sm text-[var(--muted-foreground)] underline-offset-4 hover:underline"
        >
          {tAuth("signOut")}
        </button>
      </Card>
    </main>
  );
}
