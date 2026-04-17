'use client';

interface BroadcastListSkeletonProps {
  rows?: number;
}

export function BroadcastListSkeleton({
  rows = 5,
}: Readonly<BroadcastListSkeletonProps>) {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[10px] border-[1.5px] border-[var(--border-light)] bg-[var(--paper)]"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3.5 w-40 bg-[var(--muted)] rounded animate-pulse" />
              <div className="h-3.5 w-14 bg-[var(--muted)] rounded-full animate-pulse" />
            </div>
            <div className="h-3 w-3/4 bg-[var(--muted)] rounded animate-pulse mb-2" />
            <div className="h-2.5 w-32 bg-[var(--muted)] rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
