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
  className?: string;
  animationDelayMs?: number;
}

/**
 * Inline upgrade card for sidebar slots and in-page upsell sections.
 * Smaller and lighter than `UpsellHero` — designed to live alongside the
 * feature instead of replacing it. Dark icon square, subtle amber glow,
 * dark CTA pill. Stacks vertically on narrow containers.
 */
export function UpsellInline({
  icon,
  title,
  description,
  features = [],
  ctaLabel,
  ctaHref,
  className,
  animationDelayMs,
}: UpsellInlineProps) {
  const styleProp = animationDelayMs
    ? { animationDelay: `${animationDelayMs}ms` }
    : undefined;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-5',
        animationDelayMs && 'animate-slide-up',
        className
      )}
      style={styleProp}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] text-white flex items-center justify-center shadow-md shadow-black/10 shrink-0">
            {icon ?? (
              <CrownIcon className="w-4 h-4 text-amber-400" weight="fill" />
            )}
          </div>
          <div className="text-[14px] font-bold text-[#1A1A1A] leading-tight min-w-0">
            {title}
          </div>
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
  );
}
