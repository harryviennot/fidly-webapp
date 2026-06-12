"use client";

import { Lock } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

/**
 * Blocked state for a NON-OWNER member of a card-upfront business whose owner
 * hasn't completed Stripe Checkout yet (STA-215). The owner gets bounced to
 * the wizard's plan step to pay; a team member can't pay, so they see this
 * informative screen instead of the dashboard. No sidebar — there's nothing
 * actionable here for them.
 */
export function CheckoutRequiredPage() {
  const t = useTranslations("auth");

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center bg-[var(--background)] p-6">
      <div className="paper-card relative max-w-lg w-full rounded-3xl p-10 text-center animate-slide-up delay-0">
        <div className="mb-6 flex justify-center animate-slide-up delay-80">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-[var(--accent-light)]">
            <Lock size={40} weight="duotone" className="text-[var(--accent)]" />
          </div>
        </div>

        <h1 className="text-[26px] font-bold tracking-tight text-[var(--foreground)] mb-3 animate-slide-up delay-160">
          {t("checkoutRequired.title")}
        </h1>

        <p className="text-[var(--muted-foreground)] leading-relaxed animate-slide-up delay-240 max-w-sm mx-auto">
          {t("checkoutRequired.description")}
        </p>
      </div>
    </main>
  );
}
