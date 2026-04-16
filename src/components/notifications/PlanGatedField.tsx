'use client';

import { useTranslations } from 'next-intl';
import { useEntitlements, type SubscriptionTier } from '@/hooks/useEntitlements';
import { UpsellCard } from '@/components/reusables/upsell/upsell-card';

interface PlanGatedFieldProps {
  /** Minimum tier required to use the wrapped field. */
  requiredTier: 'growth' | 'pro';
  /** Query param for billing analytics, e.g. "messages.scheduling". */
  upgradeFrom?: string;
  /** Title for the upsell card when gated. */
  gatedTitle?: React.ReactNode;
  /** Description for the upsell card when gated. */
  gatedDescription?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const TIER_RANK: Record<SubscriptionTier, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
};

/**
 * Wraps a field — when the user's tier is high enough, renders children
 * normally. Otherwise, replaces them with an UpsellCard showing the
 * gated content in the upsell design language (amber glow, dark icon
 * square, dark CTA pill).
 */
export function PlanGatedField({
  requiredTier,
  upgradeFrom,
  gatedTitle,
  gatedDescription,
  children,
  className,
}: PlanGatedFieldProps) {
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
      ctaLabel={t('upgradeTo', { tier: tierLabel })}
      ctaHref={`/billing${from}`}
      className={className}
    />
  );
}
