'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Info } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEntitlements } from '@/hooks/useEntitlements';

/**
 * Gates content behind a specific feature.
 * Shows blurred preview with upgrade prompt when the feature is not available.
 */
interface FeatureGateProps {
  /** Feature key to check (e.g., "locations.geofencing") */
  feature: string;
  /** Description of what's gated */
  description?: string;
  /** What to show when gated: 'blur' shows blurred content, 'hide' hides completely */
  fallback?: 'blur' | 'hide';
  children: ReactNode;
}

export function FeatureGate({
  feature,
  description,
  fallback = 'blur',
  children,
}: FeatureGateProps) {
  const { hasFeature } = useEntitlements();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback === 'hide') {
    return null;
  }

  // Blur fallback
  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
        <div className="text-center space-y-2 p-4">
          <Crown className="w-8 h-8 text-amber-500 mx-auto" weight="fill" />
          {description && (
            <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href="/billing">Upgrade</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline upgrade prompt for use next to disabled buttons/actions.
 */
interface UpgradePromptProps {
  message: string;
  compact?: boolean;
}

export function UpgradePrompt({ message, compact = false }: UpgradePromptProps) {
  if (compact) {
    return (
      <span className="text-xs text-muted-foreground">
        {message}{' '}
        <Link href="/billing" className="text-amber-600 hover:underline">
          Upgrade
        </Link>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
      <Info className="w-4 h-4 text-amber-600 flex-shrink-0" weight="fill" />
      <span className="text-amber-800">{message}</span>
      <Button asChild size="sm" variant="outline" className="ml-auto">
        <Link href="/billing">
          Upgrade
        </Link>
      </Button>
    </div>
  );
}

/**
 * Badge indicating a limit has been reached.
 */
interface LimitBadgeProps {
  current: number;
  limit: number;
}

export function LimitBadge({ current, limit }: LimitBadgeProps) {
  const isAtLimit = current >= limit;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isAtLimit
          ? 'bg-amber-100 text-amber-700'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {current}/{limit}
      {isAtLimit && <Crown className="w-3 h-3" weight="fill" />}
    </span>
  );
}

/**
 * Simple locked badge for inline use.
 */
export function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
      <Crown className="w-3 h-3" weight="fill" />
      Pro
    </span>
  );
}
