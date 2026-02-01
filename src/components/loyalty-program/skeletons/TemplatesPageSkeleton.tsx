'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function TemplatesPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {/* Active card skeleton */}
      <div className="p-4 rounded-xl border-2 border-dashed border-[var(--accent)]/30 bg-[var(--accent)]/5">
        <Skeleton className="h-4 w-20 mb-4" />
        <div className="flex items-start gap-6">
          <Skeleton className="w-64 h-44 rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Card grid skeleton */}
      <div>
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="w-full aspect-[1/1.282] rounded-xl" />
              <div className="flex items-center justify-between px-1">
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
