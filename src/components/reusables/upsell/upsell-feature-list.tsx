'use client';

import { CheckCircleIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface UpsellFeatureListProps {
  features: React.ReactNode[];
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Check-marked feature list shared by the upsell card variants.
 *
 * `sm` matches the compact `UpsellInline` styling, `md` matches the
 * larger `UpsellHero` centered layout.
 */
export function UpsellFeatureList({
  features,
  size = 'md',
  className,
}: UpsellFeatureListProps) {
  const isSm = size === 'sm';
  return (
    <ul
      className={cn(
        'flex flex-col text-left',
        isSm ? 'gap-1.5' : 'gap-2.5 max-w-sm w-full',
        className
      )}
    >
      {features.map((f, i) => (
        <li
          key={i}
          className={cn(
            'flex items-start gap-2 text-[#1A1A1A]',
            isSm ? 'text-[12px]' : 'gap-2.5 text-[13px]'
          )}
        >
          <CheckCircleIcon
            className={cn(
              'text-amber-500 mt-0.5 shrink-0',
              isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'
            )}
            weight="fill"
          />
          <span className="leading-[1.45]">{f}</span>
        </li>
      ))}
    </ul>
  );
}
