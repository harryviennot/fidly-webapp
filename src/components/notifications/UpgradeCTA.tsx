'use client';

import Link from 'next/link';
import { CrownIcon, CheckCircleIcon, SparkleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UpgradeCTAProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  features?: string[];
  ctaLabel: string;
  upgradeFrom?: string;
  className?: string;
}

/**
 * Reusable empty-state upgrade card.
 *
 * Used for locked Starter pages (e.g. /program/broadcasts landing) and
 * locked-feature sections (e.g. Growth user hitting milestone cap).
 */
export function UpgradeCTA({
  icon,
  title,
  description,
  features = [],
  ctaLabel,
  upgradeFrom,
  className,
}: UpgradeCTAProps) {
  const href = upgradeFrom
    ? `/billing?from=${encodeURIComponent(upgradeFrom)}`
    : '/billing';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]',
        className
      )}
    >
      {/* Subtle amber glow in the top-right */}
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
          <ul className="flex flex-col gap-2.5 mb-7 text-left max-w-sm w-full">
            {features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2.5 text-[13px] text-[#1A1A1A]"
              >
                <CheckCircleIcon
                  className="w-4 h-4 text-amber-500 mt-0.5 shrink-0"
                  weight="fill"
                />
                <span className="leading-[1.45]">{f}</span>
              </li>
            ))}
          </ul>
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
