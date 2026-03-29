"use client";

import { useTranslations } from "next-intl";
import { Lock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useCheckout } from "@/hooks/useBilling";
import { useBusiness } from "@/contexts/business-context";

export function SuspendedOverlay() {
  const t = useTranslations("billing");
  const { currentBusiness } = useBusiness();
  const checkout = useCheckout();

  const tier = currentBusiness?.subscription_tier || "starter";

  const handleSubscribe = () => {
    checkout.mutate({
      tier,
      successUrl: `${window.location.origin}/settings/billing?success=true`,
      cancelUrl: `${window.location.origin}/settings/billing`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="max-w-md mx-auto text-center px-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
          <Lock className="w-8 h-8 text-red-500" weight="fill" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t("suspendedTitle")}
        </h2>
        <p className="text-gray-500 mb-6">
          {t("suspendedDescription")}
        </p>
        <Button
          variant="gradient"
          className="rounded-full px-8"
          onClick={handleSubscribe}
          disabled={checkout.isPending}
        >
          {checkout.isPending ? t("redirecting") : t("subscribeCta")}
        </Button>
        <p className="text-xs text-gray-400 mt-4">
          {t("suspendedDataSafe")}
        </p>
      </div>
    </div>
  );
}
