'use client';

import { useTranslations } from 'next-intl';
import { useEntitlements, type SubscriptionTier } from '@/hooks/useEntitlements';
import { UpsellCard } from '@/components/reusables/upsell/upsell-card';

interface GatedFeatureProps {
  /** Minimum tier required to use the wrapped field. */
  requiredTier: 'growth' | 'pro';
  /** Query param for billing analytics, e.g. "broadcasts.scheduling". */
  upgradeFrom?: string;
  /** Title for the upsell card when gated. */
  gatedTitle?: React.ReactNode;
  /** Description for the upsell card when gated. */
  gatedDescription?: React.ReactNode;
  /** Feature bullets shown in the upsell card when gated. */
  gatedFeatures?: React.ReactNode[];
  children: React.ReactNode;
  className?: string;
}

const TIER_RANK: Record<SubscriptionTier, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
};

/**
 * Wraps a feature — when the user's tier is high enough, renders children
 * normally. Otherwise, replaces them with an UpsellCard in the standard
 * upsell design language (amber glow, crown square, dark CTA pill).
 */
export function GatedFeature({
  requiredTier,
  upgradeFrom,
  gatedTitle,
  gatedDescription,
  gatedFeatures,
  children,
  className,
}: GatedFeatureProps) {
  const { tier } = useEntitlements();
  const t = useTranslations('notifications.plan');

  const hasAccess = TIER_RANK[tier] >= TIER_RANK[requiredTier];

  if (hasAccess) return <>{children}</>;

  const tierLabel = requiredTier === 'pro' ? 'Pro' : 'Growth';
  const from = upgradeFrom ? `?from=${encodeURIComponent(upgradeFrom)}` : '';

  return (
    <UpsellCard
      title={gatedTitle ?? t('lockedTooltip', { tier: tierLabel })}
      description={gatedDescription}
      features={gatedFeatures}
      ctaLabel={t('upgradeTo', { tier: tierLabel })}
      ctaHref={`/billing${from}`}
      className={className}
    />
  );
}

/** @deprecated Use GatedFeature instead */
export const PlanGatedField = GatedFeature;
