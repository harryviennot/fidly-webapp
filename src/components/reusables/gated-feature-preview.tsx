'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CrownIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useEntitlements, type SubscriptionTier } from '@/hooks/useEntitlements';
import { UpsellFeatureList } from './upsell/upsell-feature-list';

interface GatedFeaturePreviewProps {
  /** Minimum tier required to actually use the wrapped feature. */
  requiredTier: 'growth' | 'pro';
  /** Query param appended to the billing CTA link for analytics. */
  upgradeFrom?: string;
  /** Headline shown in the overlay. */
  gatedTitle?: React.ReactNode;
  /** Optional description line under the headline. */
  gatedDescription?: React.ReactNode;
  /** Optional bullet feature list shown in the overlay. */
  gatedFeatures?: React.ReactNode[];
  children: React.ReactNode;
  /** Overlay placement. `inset` covers the children; `corner` floats a
   *  smaller chip in the corner. Default `inset`. */
  variant?: 'inset' | 'corner';
  className?: string;
}

const TIER_RANK: Record<SubscriptionTier, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
};

/**
 * Soft-gate variant of `GatedFeature`. Instead of replacing the gated
 * children with an upsell card, the children stay visible but blurred and
 * uninteractive, with a polished overlay pitching the upgrade. Lets
 * lower-tier users preview what they're missing without being able to
 * fiddle with the controls.
 *
 * Pairs well with single sub-sections inside an otherwise-editable group
 * (e.g. the location sub-blocks inside the Enrollment/Activity groups in
 * the broadcasts wizard).
 */
export function GatedFeaturePreview({
  requiredTier,
  upgradeFrom,
  gatedTitle,
  gatedDescription,
  gatedFeatures,
  children,
  variant = 'inset',
  className,
}: GatedFeaturePreviewProps) {
  const { tier } = useEntitlements();
  const t = useTranslations('notifications.plan');
  const hasAccess = TIER_RANK[tier] >= TIER_RANK[requiredTier];

  if (hasAccess) return <>{children}</>;

  const tierLabel = requiredTier === 'pro' ? 'Pro' : 'Growth';
  const from = upgradeFrom ? `?from=${encodeURIComponent(upgradeFrom)}` : '';
  const ctaHref = `/billing${from}`;
  const title = gatedTitle ?? t('lockedTooltip', { tier: tierLabel });

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[10px] isolate',
        className
      )}
    >
      {/* Gated content — kept readable so non-Pro users can see the options
          they're missing. Just enough desaturation + dimming to feel locked
          without obscuring the labels. */}
      <div
        aria-hidden
        className="pointer-events-none select-none opacity-70 saturate-[0.5]"
      >
        {children}
      </div>

      {/* Overlay — amber wash + upsell card */}
      <div
        className={cn(
          'absolute inset-0 flex',
          variant === 'inset' ? 'items-center justify-center p-3' : 'items-start justify-end p-2'
        )}
      >
        {/* Background wash so blurred fields don't bleed through too much */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-amber-50/70 via-white/40 to-transparent"
        />

        {variant === 'inset' ? (
          <Link
            href={ctaHref}
            className="relative z-10 max-w-[320px] w-full rounded-xl border border-amber-200/60 bg-white/95 backdrop-blur-sm p-3.5 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.12)] transition-all hover:border-amber-300 hover:shadow-[0_10px_25px_-8px_rgba(0,0,0,0.18)] group"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] text-amber-400 flex items-center justify-center shrink-0">
                <CrownIcon className="w-4 h-4" weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1A1A1A] leading-tight mb-0.5">
                  {title}
                </p>
                {gatedDescription && (
                  <p className="text-[11px] text-[#666] leading-[1.4]">
                    {gatedDescription}
                  </p>
                )}
              </div>
            </div>
            {gatedFeatures && gatedFeatures.length > 0 && (
              <div className="mt-2.5">
                <UpsellFeatureList features={gatedFeatures} size="sm" />
              </div>
            )}
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm group-hover:bg-[#1A1A1A]/90 transition-colors">
              {t('upgradeTo', { tier: tierLabel })}
            </div>
          </Link>
        ) : (
          <Link
            href={ctaHref}
            className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-3 py-1.5 text-[11px] font-semibold text-white shadow-md transition-colors hover:bg-[#1A1A1A]/90"
          >
            <CrownIcon className="w-3.5 h-3.5 text-amber-400" weight="fill" />
            {t('upgradeTo', { tier: tierLabel })}
          </Link>
        )}
      </div>
    </div>
  );
}
