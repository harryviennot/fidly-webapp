'use client';

import Link from 'next/link';
import { CrownIcon, SparkleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UpsellFeatureList } from './upsell-feature-list';

export interface UpsellHeroProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  features?: React.ReactNode[];
  ctaLabel: React.ReactNode;
  /**
   * `upgradeFrom` is appended as a `?from=` query param on the billing link.
   * Pass `ctaHref` directly to override the destination entirely.
   */
  upgradeFrom?: string;
  ctaHref?: string;
  className?: string;
}

/**
 * Centered full-width upgrade card shown when an entire feature is locked
 * (e.g. Starter user landing on `/program/broadcasts`). Dark icon square
 * with a sparkle badge, amber glow backdrop, dark CTA pill.
 */
export function UpsellHero({
  icon,
  title,
  description,
  features = [],
  ctaLabel,
  upgradeFrom,
  ctaHref,
  className,
}: UpsellHeroProps) {
  const href =
    ctaHref ??
    (upgradeFrom
      ? `/billing?from=${encodeURIComponent(upgradeFrom)}`
      : '/billing');

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]',
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-60 w-60 rounded-full bg-amber-200/40 blur-3xl"
      />

      <div className="relative flex flex-col items-center text-center px-6 py-12 sm:py-14">
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] text-white flex items-center justify-center shadow-lg shadow-black/20">
            {icon ?? <CrownIcon className="w-7 h-7 text-amber-400" weight="fill" />}
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 border border-amber-500/40 flex items-center justify-center shadow-sm">
            <SparkleIcon
              className="h-3.5 w-3.5 text-[#1A1A1A]"
              weight="fill"
            />
          </div>
        </div>

        <h2 className="text-[20px] sm:text-[22px] font-bold text-[#1A1A1A] mb-2 leading-tight max-w-md">
          {title}
        </h2>
        <p className="text-[13.5px] text-[#555] max-w-md leading-[1.55] mb-6">
          {description}
        </p>

        {features.length > 0 && (
          <div className="mb-7">
            <UpsellFeatureList features={features} size="md" />
          </div>
        )}

        <Button
          asChild
          className="rounded-full px-6 bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90"
        >
          <Link href={href}>{ctaLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
