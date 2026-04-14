'use client';

import Link from 'next/link';
import { Crown, CheckCircle } from '@phosphor-icons/react';
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
        'flex flex-col items-center text-center py-12 px-6 rounded-xl border-2 border-dashed border-border bg-muted/20',
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4 text-amber-700">
        {icon ?? <Crown className="w-7 h-7" weight="fill" />}
      </div>

      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {description}
      </p>

      {features.length > 0 && (
        <ul className="flex flex-col gap-2 mb-6 text-sm text-foreground">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <CheckCircle
                className="w-4 h-4 text-[var(--success)]"
                weight="fill"
              />
              {f}
            </li>
          ))}
        </ul>
      )}

      <Button asChild>
        <Link href={href}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
