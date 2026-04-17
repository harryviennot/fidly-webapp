'use client';

interface TriggerListSkeletonProps {
  rows?: number;
}

/**
 * Skeleton matching the trigger / milestone row layout. Mirrors
 * `BroadcastListSkeleton` so loading states look consistent across the
 * notifications surface.
 */
export function TriggerListSkeleton({
  rows = 3,
}: Readonly<TriggerListSkeletonProps>) {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[10px] border-[1.5px] border-[var(--border-light)] bg-[var(--paper)]"
        >
          <div className="h-9 w-9 rounded-lg bg-[var(--muted)] animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3.5 w-32 bg-[var(--muted)] rounded animate-pulse" />
              <div className="h-3 w-12 bg-[var(--muted)] rounded animate-pulse" />
            </div>
            <div className="h-3 w-3/4 bg-[var(--muted)] rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="h-4 w-6 bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-5 w-9 bg-[var(--muted)] rounded-full animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
