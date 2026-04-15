'use client';

import Link from 'next/link';
import { CrownIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UpsellFeatureList } from './upsell-feature-list';

export interface UpsellInlineProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  features?: React.ReactNode[];
  ctaLabel: React.ReactNode;
  ctaHref: string;
  /**
   * `compact` mode (default) renders the original Pro sidebar widget — small
   * gradient amber tile with a tight feature list. `wide` matches the larger
   * GrowthUpsellCard pattern (horizontal layout on `sm`, dark icon square,
   * subtle amber glow). Pick whichever fits the slot.
   */
  variant?: 'compact' | 'wide';
  className?: string;
  animationDelayMs?: number;
}

/**
 * Inline upgrade card for sidebar slots and in-page upsell sections.
 * Smaller and lighter than `UpsellHero` — designed to live alongside the
 * feature instead of replacing it.
 */
export function UpsellInline({
  icon,
  title,
  description,
  features = [],
  ctaLabel,
  ctaHref,
  variant = 'wide',
  className,
  animationDelayMs,
}: UpsellInlineProps) {
  const styleProp = animationDelayMs
    ? { animationDelay: `${animationDelayMs}ms` }
    : undefined;

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-200 p-[18px]',
          animationDelayMs && 'animate-slide-up',
          className
        )}
        style={styleProp}
      >
        <div className="flex items-center gap-2 mb-2">
          {icon ?? (
            <CrownIcon className="h-4 w-4 text-amber-600" weight="fill" />
          )}
          <div className="text-[13px] font-semibold text-amber-900">
            {title}
          </div>
        </div>
        <p className="text-[11px] text-amber-800 leading-[1.45] mb-3">
          {description}
        </p>
        {features.length > 0 && (
          <div className="mb-3">
            <UpsellFeatureList features={features} size="sm" />
          </div>
        )}
        <Button asChild size="sm" className="w-full rounded-full">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 min-[1080px]:p-6',
        animationDelayMs && 'animate-slide-up',
        className
      )}
      style={styleProp}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl"
      />
      <div className="relative flex flex-col sm:flex-row gap-5 sm:items-center">
        <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center shadow-md shadow-black/10 shrink-0">
          {icon ?? (
            <CrownIcon className="w-5 h-5 text-amber-400" weight="fill" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-[#1A1A1A] leading-tight mb-1">
            {title}
          </div>
          <p className="text-[12px] text-[#555] leading-[1.5] mb-3">
            {description}
          </p>
          {features.length > 0 && (
            <div className="mb-4">
              <UpsellFeatureList features={features} size="sm" />
            </div>
          )}
          <Button
            asChild
            size="sm"
            className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90"
          >
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
