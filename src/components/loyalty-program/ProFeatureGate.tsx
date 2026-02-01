'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, RocketLaunch, Info } from '@phosphor-icons/react';
import Link from 'next/link';

interface ProFeatureGateProps {
  feature: string;
  description: string;
  isProPlan: boolean;
  children: ReactNode;
}

/**
 * Gates content behind Pro subscription.
 * Shows blurred preview with upgrade prompt for non-Pro users.
 */
export function ProFeatureGate({ feature, description, isProPlan, children }: ProFeatureGateProps) {
  if (isProPlan) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred preview */}
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
        <div className="text-center max-w-sm p-6">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-6 h-6 text-amber-600" weight="fill" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{feature}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <Button asChild className="rounded-full">
            <Link href="/settings/billing">
              <RocketLaunch className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Flexible feature gate supporting both feature flags and usage limits.
 */
interface FeatureGateProps {
  /** Whether the feature/action is allowed */
  allowed: boolean;
  /** Title for the gate message */
  title?: string;
  /** Description explaining why it's gated */
  description: string;
  /** What to show when gated: 'blur' shows blurred content, 'hide' hides completely, 'disable' renders children but disabled */
  fallback?: 'blur' | 'hide' | 'disable';
  /** Custom fallback element */
  customFallback?: ReactNode;
  children: ReactNode;
}

export function FeatureGate({
  allowed,
  title = 'Upgrade Required',
  description,
  fallback = 'blur',
  customFallback,
  children,
}: FeatureGateProps) {
  if (allowed) {
    return <>{children}</>;
  }

  if (fallback === 'hide') {
    return null;
  }

  if (customFallback) {
    return <>{customFallback}</>;
  }

  if (fallback === 'disable') {
    return (
      <div className="opacity-50 pointer-events-none select-none">
        {children}
      </div>
    );
  }

  // Default: blur with overlay
  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
        <div className="text-center max-w-sm p-6">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-6 h-6 text-amber-600" weight="fill" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <Button asChild className="rounded-full">
            <Link href="/settings/billing">
              <RocketLaunch className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Link>
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
