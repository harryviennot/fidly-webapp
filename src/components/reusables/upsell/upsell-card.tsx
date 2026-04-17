'use client';

import Link from 'next/link';
import { CrownIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { UpsellFeatureList } from './upsell-feature-list';

export interface UpsellCardProps {
  /** Title text next to the crown icon. */
  title: React.ReactNode;
  /** Short description below the icon row. */
  description?: React.ReactNode;
  /** Bullet-point features shown between description and CTA. */
  features?: React.ReactNode[];
  /** CTA label shown in the dark upgrade pill. */
  ctaLabel: React.ReactNode;
  /** Destination when clicking the card. */
  ctaHref: string;
  className?: string;
}

/**
 * Compact upsell card — same design language as `UpsellInline` (amber glow,
 * dark crown square, dark CTA pill) but sized to fit inline next to regular
 * option cards (e.g. in a 2-column "Send now" / "Schedule for later" grid).
 *
 * The entire card is a single clickable link.
 */
export function UpsellCard({
  title,
  description,
  features = [],
  ctaLabel,
  ctaHref,
  className,
}: UpsellCardProps) {
  return (
    <Link
      href={ctaHref}
      className={cn(
        'relative overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--card)] block transition-all hover:border-[var(--border-dark)] group',
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl"
      />
      <div className="relative p-3.5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] text-white flex items-center justify-center shadow-md shadow-black/10 shrink-0">
            <CrownIcon className="w-4 h-4 text-amber-400" weight="fill" />
          </div>
          <span className="text-[13px] font-semibold text-[#1A1A1A] leading-tight">
            {title}
          </span>
        </div>
        {description && (
          <p className="text-[11px] text-[#8A8A8A] leading-[1.4] mb-2">
            {description}
          </p>
        )}
        {features.length > 0 && (
          <div className="mb-2.5">
            <UpsellFeatureList features={features} size="sm" />
          </div>
        )}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm group-hover:bg-[#1A1A1A]/90 transition-colors">
          {ctaLabel}
        </div>
      </div>
    </Link>
  );
}
