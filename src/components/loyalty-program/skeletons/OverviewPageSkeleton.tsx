'use client';

export function OverviewPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header - static, no skeleton needed */}
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Your loyalty program at a glance
        </p>
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats + Status indicators skeleton - appears first on mobile */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
          {/* Stats grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--cream)]"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--muted)] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 w-12 bg-[var(--muted)] rounded animate-pulse" />
                  <div className="h-4 w-20 bg-[var(--muted)] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Status indicators skeleton */}
          <div className="space-y-4">
            <div className="h-5 w-32 bg-[var(--muted)] rounded animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-lg border border-[var(--border)]">
                  <div className="h-4 w-24 bg-[var(--muted)] rounded animate-pulse mb-2" />
                  <div className="h-5 w-16 bg-[var(--muted)] rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active card widget skeleton - appears second on mobile */}
        <div className="lg:col-span-1 order-2 lg:order-1 max-w-xs lg:max-w-none space-y-3">
          {/* Card preview skeleton */}
          <div className="aspect-[1/1.282] w-full bg-[var(--muted)] rounded-2xl animate-pulse" />
          {/* Label skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 bg-[var(--muted)] rounded animate-pulse" />
              <div className="h-5 w-10 bg-[var(--muted)] rounded-full animate-pulse" />
            </div>
            <div className="h-6 w-6 bg-[var(--muted)] rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
