'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, RocketLaunchIcon } from '@phosphor-icons/react';
import Link from 'next/link';

interface ProFeatureGateProps {
  feature: string;
  description: string;
  isProPlan: boolean;
  children: ReactNode;
}

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
              <RocketLaunchIcon className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Simple locked badge for inline use
export function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
      <Crown className="w-3 h-3" weight="fill" />
      Pro
    </span>
  );
}
