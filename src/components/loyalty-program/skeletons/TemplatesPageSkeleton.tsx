'use client';

import { Button } from '@/components/ui/button';
import { PlusIcon } from '@phosphor-icons/react';

export function TemplatesPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Static page header with disabled button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Card Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage your loyalty card designs
          </p>
        </div>
        <Button disabled className="rounded-full">
          <PlusIcon className="w-4 h-4 mr-2" />
          New Card
        </Button>
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <div className="w-full aspect-[1/1.282] rounded-2xl bg-[var(--muted)] animate-pulse" />
            <div className="flex items-center justify-between px-1">
              <div className="space-y-1">
                <div className="h-4 w-24 bg-[var(--muted)] rounded animate-pulse" />
                <div className="h-3 w-16 bg-[var(--muted)] rounded animate-pulse" />
              </div>
              <div className="h-6 w-6 bg-[var(--muted)] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
