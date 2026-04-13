'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Crown } from '@phosphor-icons/react';
import { useEntitlements, type SubscriptionTier } from '@/hooks/useEntitlements';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PlanGatedFieldProps {
  /** Minimum tier required to use the wrapped field. */
  requiredTier: 'growth' | 'pro';
  /** Query param for billing analytics, e.g. "messages.scheduling". */
  upgradeFrom?: string;
  children: React.ReactNode;
  className?: string;
}

const TIER_RANK: Record<SubscriptionTier, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
};

/**
 * Wraps a field with a locked overlay when the current business's tier is
 * below `requiredTier`. On click, navigates to /billing with an analytics
 * query param so we can track which locked touch points drive upgrades.
 */
export function PlanGatedField({
  requiredTier,
  upgradeFrom,
  children,
  className,
}: PlanGatedFieldProps) {
  const { tier } = useEntitlements();
  const router = useRouter();
  const t = useTranslations('notifications.plan');

  const hasAccess = TIER_RANK[tier] >= TIER_RANK[requiredTier];

  if (hasAccess) return <>{children}</>;

  const badgeLabel = requiredTier === 'pro' ? 'PRO' : 'GROWTH';
  const tooltipLabel = t('lockedTooltip', {
    tier: requiredTier === 'pro' ? 'Pro' : 'Growth',
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const from = upgradeFrom ? `?from=${encodeURIComponent(upgradeFrom)}` : '';
    router.push(`/billing${from}`);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={handleClick}
            className={cn('relative cursor-pointer group', className)}
          >
            <div className="pointer-events-none opacity-60 grayscale">
              {children}
            </div>
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 shadow-sm">
              <Crown className="h-3 w-3" weight="fill" />
              {badgeLabel}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
