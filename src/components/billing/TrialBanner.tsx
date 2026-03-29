"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Clock, WarningCircle, Info, X } from "@phosphor-icons/react";
import { useBillingStatus } from "@/hooks/useBilling";
import { useBusiness } from "@/contexts/business-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type BannerVariant = "info" | "warning" | "error";

interface BannerVisibility {
  shouldShow: boolean;
  isUrgent: boolean;
  isDismissable: boolean;
  variant: BannerVariant;
  message: string;
  onDismiss: () => void;
}

const DISMISS_KEY_PREFIX = "trial_banner_dismissed_";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getDismissedAt(businessId: string): number | null {
  try {
    const val = localStorage.getItem(`${DISMISS_KEY_PREFIX}${businessId}`);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

function setDismissedAt(businessId: string) {
  try {
    localStorage.setItem(`${DISMISS_KEY_PREFIX}${businessId}`, String(Date.now()));
  } catch {
    // localStorage unavailable
  }
}

function useTrialBannerVisibility(): BannerVisibility {
  const t = useTranslations("billing");
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id ?? "";
  const {
    isTrialing,
    isGrace,
    isPastDue,
    daysRemaining,
    isActiveInTrial,
    daysUntilFirstCharge,
  } = useBillingStatus();

  // Store whether the banner was recently dismissed (within 7 days)
  const [isDismissedRecently, setIsDismissedRecently] = useState(() => {
    const dismissedAt = getDismissedAt(businessId);
    if (dismissedAt === null) return false;
    return (performance.now() + performance.timeOrigin - dismissedAt) < DISMISS_DURATION_MS;
  });

  const onDismiss = useCallback(() => {
    setDismissedAt(businessId);
    setIsDismissedRecently(true);
  }, [businessId]);

  const noop: BannerVisibility = {
    shouldShow: false,
    isUrgent: false,
    isDismissable: false,
    variant: "info",
    message: "",
    onDismiss,
  };

  // State B: Subscribed during trial — only show when ≤3 days to first charge
  if (isActiveInTrial) {
    if (daysUntilFirstCharge === null || daysUntilFirstCharge > 3) return noop;
    return {
      shouldShow: true,
      isUrgent: false,
      isDismissable: false,
      variant: "info",
      message: t("trialSidebarBillingSoon", { days: daysUntilFirstCharge }),
      onDismiss,
    };
  }

  // Grace or past_due: always show, never dismissable
  if (isGrace) {
    return {
      shouldShow: true,
      isUrgent: true,
      isDismissable: false,
      variant: "warning",
      message: t("trialSidebarGrace"),
      onDismiss,
    };
  }

  if (isPastDue) {
    return {
      shouldShow: true,
      isUrgent: true,
      isDismissable: false,
      variant: "error",
      message: t("trialSidebarPastDue"),
      onDismiss,
    };
  }

  // Trial without subscription
  if (!isTrialing || daysRemaining === null) return noop;

  const isUrgent = daysRemaining <= 3;

  // Check dismiss state: override if urgent or if dismissed > 7 days ago
  if (isDismissedRecently && !isUrgent) return noop;

  return {
    shouldShow: true,
    isUrgent,
    isDismissable: !isUrgent,
    variant: isUrgent ? "warning" : "info",
    message: isUrgent
      ? t("trialSidebarUrgent", { days: daysRemaining })
      : t("trialSidebarInfo", { days: daysRemaining }),
    onDismiss,
  };
}

const VARIANT_STYLES: Record<BannerVariant, { bg: string; text: string; border: string }> = {
  info: {
    bg: "bg-[var(--info-light)]",
    text: "text-[var(--info)]",
    border: "border-[var(--info)]/20",
  },
  warning: {
    bg: "bg-[var(--warning-light)]",
    text: "text-[var(--warning)]",
    border: "border-[var(--warning)]/20",
  },
  error: {
    bg: "bg-[var(--error-light)]",
    text: "text-[var(--error)]",
    border: "border-[var(--error)]/20",
  },
};

const VARIANT_ICONS: Record<BannerVariant, typeof Clock> = {
  info: Info,
  warning: Clock,
  error: WarningCircle,
};

/**
 * Compact trial widget for the sidebar footer (desktop only).
 */
export function TrialSidebarWidget() {
  const { shouldShow, variant, message, isDismissable, onDismiss } =
    useTrialBannerVisibility();

  if (!shouldShow) return null;

  const styles = VARIANT_STYLES[variant];
  const Icon = VARIANT_ICONS[variant];

  return (
    <div className="px-3 pb-1">
      <div
        className={cn(
          "relative rounded-lg border p-3",
          styles.bg,
          styles.border
        )}
      >
        {isDismissable && (
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 p-0.5 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className={cn("w-3 h-3", styles.text)} />
          </button>
        )}
        <div className="flex items-start gap-2 pr-4">
          <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", styles.text)} weight="fill" />
          <div className="min-w-0">
            <p className={cn("text-xs font-medium leading-tight", styles.text)}>
              {message}
            </p>
            <Link
              href="/settings/billing"
              className={cn(
                "text-[11px] font-semibold underline underline-offset-2 mt-1 inline-block",
                styles.text
              )}
            >
              {variant === "error" ? "Update billing" : "View plans"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Slim top banner for mobile (only renders on mobile viewports).
 */
export function TrialMobileBanner() {
  const isMobile = useIsMobile();
  const { shouldShow, variant, message, isDismissable, onDismiss } =
    useTrialBannerVisibility();

  if (!isMobile || !shouldShow) return null;

  const styles = VARIANT_STYLES[variant];
  const Icon = VARIANT_ICONS[variant];

  return (
    <Link
      href="/settings/billing"
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b transition-colors",
        styles.bg,
        styles.text,
        styles.border
      )}
    >
      <Icon className="w-4 h-4 shrink-0" weight="fill" />
      <span className="flex-1 min-w-0 truncate">{message}</span>
      {isDismissable && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          className="shrink-0 p-1 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </Link>
  );
}
