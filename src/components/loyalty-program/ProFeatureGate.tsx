'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Info } from '@phosphor-icons/react';
import Link from 'next/link';

// BYPASSED FOR MVP: Props preserved for re-enabling later
interface ProFeatureGateProps {
  feature?: string;
  description?: string;
  isProPlan?: boolean;
  children: ReactNode;
}

/**
 * Gates content behind Pro subscription.
 * Shows blurred preview with upgrade prompt for non-Pro users.
 *
 * NOTE: BYPASSED FOR MVP - Always renders children regardless of plan.
 */
export function ProFeatureGate({ children }: ProFeatureGateProps) {
  // BYPASSED FOR MVP: Always show content regardless of plan
  // Re-enable gating when implementing paid tiers
  return <>{children}</>;
}

/**
 * Flexible feature gate supporting both feature flags and usage limits.
 * BYPASSED FOR MVP: Props preserved for re-enabling later
 */
interface FeatureGateProps {
  /** Whether the feature/action is allowed */
  allowed?: boolean;
  /** Title for the gate message */
  title?: string;
  /** Description explaining why it's gated */
  description?: string;
  /** What to show when gated: 'blur' shows blurred content, 'hide' hides completely, 'disable' renders children but disabled */
  fallback?: 'blur' | 'hide' | 'disable';
  /** Custom fallback element */
  customFallback?: ReactNode;
  children: ReactNode;
}

/**
 * NOTE: BYPASSED FOR MVP - Always renders children regardless of allowed prop.
 */
export function FeatureGate({
  children,
}: FeatureGateProps) {
  // BYPASSED FOR MVP: Always show content regardless of allowed prop
  // Re-enable gating when implementing paid tiers
  return <>{children}</>;
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
        <Link href="/settings/billing" className="text-amber-600 hover:underline">
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
        <Link href="/settings/billing">
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
