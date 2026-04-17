'use client';

import { CheckIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface PricingTierCardProps {
  /** Tier name (rendered capitalized in the heading). */
  tier: string;
  /** Pre-discount price — shown struck through when `displayPrice < basePrice`. */
  basePrice: number;
  displayPrice: number;
  perMonthLabel: React.ReactNode;
  featuresLabel: React.ReactNode;
  features: string[];
  /** Pre-built CTA button (or any node). The card itself is presentation-only. */
  cta: React.ReactNode;
  /** Highlights the card with the accent border + ring. */
  isCurrent?: boolean;
  /** Greys the card out and shows the badge — used for "Coming soon" tiers. */
  isDisabled?: boolean;
  /** Show the founding-partner price label under the price. */
  isFoundingPartner?: boolean;
  foundingLabel?: React.ReactNode;
  /** Show the reseller discount label and the struck-through base price. */
  isReseller?: boolean;
  resellerLabel?: React.ReactNode;
  /** Optional badge text shown floating on top of the card. */
  badgeText?: React.ReactNode;
  /** Animation delay forwarded to the slide-up animation. */
  delay?: number;
  className?: string;
}

/**
 * Pricing tier card used on `/billing`. Presentation-only — the caller
 * builds the CTA button so all subscription state logic stays on the page.
 */
export function PricingTierCard({
  tier,
  basePrice,
  displayPrice,
  perMonthLabel,
  featuresLabel,
  features,
  cta,
  isCurrent = false,
  isDisabled = false,
  isFoundingPartner = false,
  foundingLabel,
  isReseller = false,
  resellerLabel,
  badgeText,
  delay = 0,
  className,
}: PricingTierCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col bg-[var(--card)] rounded-xl border border-[var(--border)] animate-slide-up',
        isDisabled && 'opacity-50',
        !isDisabled &&
          isCurrent &&
          'border-[var(--accent)] ring-1 ring-[var(--accent)]',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {badgeText && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] whitespace-nowrap">
            {badgeText}
          </span>
        </div>
      )}

      <div className="p-6 pb-2">
        <h3
          className={cn(
            'text-lg font-semibold capitalize',
            isDisabled && 'text-[var(--muted-foreground)]'
          )}
        >
          {tier}
        </h3>
        <div className="flex items-baseline gap-1 mt-1">
          {isReseller && !isDisabled && (
            <span className="text-lg text-[var(--muted-foreground)] line-through mr-1">
              &euro;{basePrice}
            </span>
          )}
          <span
            className={cn(
              'text-3xl font-extrabold',
              isDisabled && 'text-[var(--muted-foreground)]'
            )}
          >
            &euro;{displayPrice}
          </span>
          <span className="text-sm text-[var(--muted-foreground)]">
            {perMonthLabel}
          </span>
        </div>
        {isFoundingPartner && !isDisabled && foundingLabel && (
          <span className="text-xs text-[var(--accent)] font-semibold">
            {foundingLabel}
          </span>
        )}
        {isReseller && !isDisabled && resellerLabel && (
          <span className="text-xs text-[var(--accent)] font-semibold">
            {resellerLabel}
          </span>
        )}
      </div>

      <div className="flex-1 px-6 pt-2">
        <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">
          {featuresLabel}
        </p>
        <ul className="space-y-1.5">
          {features.map((feature, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-[var(--foreground)]"
            >
              <CheckIcon
                className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5"
                weight="bold"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-6 pt-4">{cta}</div>
    </div>
  );
}
