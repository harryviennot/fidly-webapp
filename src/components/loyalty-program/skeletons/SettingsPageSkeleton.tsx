'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading placeholder for the program settings page. Mirrors the real layout
 * (Program Details + Data Collection on the left, recap on the right) so the
 * hand-off to content doesn't shift.
 */
export function SettingsPageSkeleton() {
  return (
    <div className="flex flex-col gap-[14px]">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-40 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex gap-[14px] flex-col min-[1080px]:flex-row min-[1080px]:items-start">
        <div className="flex-1 flex flex-col gap-[14px] min-w-0">
          {/* Program Details card */}
          <section className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6">
            <Skeleton className="h-5 w-36 mb-2" />
            <Skeleton className="h-3.5 w-56 mb-5" />
            <div className="flex flex-col gap-5">
              {/* Program name */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
              {/* Loyalty type */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-14 w-full rounded-[10px]" />
              </div>
              {/* Stamp goal */}
              <div className="space-y-3">
                <Skeleton className="h-3 w-40" />
                <div className="flex flex-wrap gap-[6px]">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="w-7 h-7 rounded-full" />
                  ))}
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
              {/* Reward */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            </div>
          </section>

          {/* Data Collection card */}
          <section className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-3.5 w-64 mb-5" />
            <div className="flex flex-col gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 min-[600px]:flex-row min-[600px]:items-center min-[600px]:gap-4 px-4 py-3.5 rounded-[10px] bg-[var(--paper)] border-[1.5px] border-[var(--border-light)]"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <Skeleton className="w-[22px] h-[22px] rounded-md flex-shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-11 w-full rounded-lg min-[600px]:w-[230px]" />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right column — recap */}
        <div className="w-full min-[1080px]:w-[290px] min-[1080px]:min-w-[290px] flex-shrink-0">
          <section className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px]">
            <Skeleton className="h-4 w-40 mb-3" />
            <Skeleton className="h-3.5 w-full mb-1.5" />
            <Skeleton className="h-3.5 w-3/4 mb-4" />
            <div className="space-y-3.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
            <Skeleton className="h-3.5 w-28 mt-4" />
          </section>
        </div>
      </div>
    </div>
  );
}
