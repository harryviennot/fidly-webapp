'use client';

export function OverviewPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-5 w-64 bg-muted rounded animate-pulse mt-1.5" />
      </div>

      {/* Setup checklist placeholder */}
      <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-44 bg-muted rounded animate-pulse" />
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-2 rounded-full bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-lg border bg-background/50 p-4 space-y-3">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-full bg-muted rounded animate-pulse" />
              <div className="h-7 w-20 bg-muted rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Main content: flex layout matching the real page */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Program Summary Card */}
          <div className="rounded-xl border p-6 space-y-4">
            <div className="h-5 w-36 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted animate-pulse flex-shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Business URL Card */}
          <div className="rounded-xl border p-6 space-y-3">
            <div className="h-5 w-28 bg-muted rounded animate-pulse" />
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <div className="h-4 flex-1 bg-muted rounded animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
            </div>
          </div>

          {/* Enrollment Card */}
          <div className="rounded-xl border p-6 space-y-4">
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-7 w-12 bg-muted rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Right column: card preview */}
        <div className="w-full max-w-[400px] flex-shrink-0">
          <div className="space-y-3">
            <div className="aspect-[1/1.282] w-full bg-muted rounded-2xl animate-pulse" />
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-5 w-10 bg-muted rounded-full animate-pulse" />
              </div>
              <div className="h-5 w-5 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
