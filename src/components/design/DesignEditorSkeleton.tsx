'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useMediaQuery } from '@/hooks/use-media-query';

function SectionSkeleton({ expanded = false }: { expanded?: boolean }) {
  return (
    <div className="bg-white border border-[#EEEDEA] rounded-xl overflow-hidden">
      <div className="w-full px-4 py-4 flex items-center gap-2.5">
        <Skeleton className="w-8 h-8 rounded flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-3.5 w-3.5 rounded-sm flex-shrink-0" />
      </div>
      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}
    </div>
  );
}

export function DesignEditorSkeleton() {
  const isWideEnough = useMediaQuery('(min-width: 1280px)');

  const sectionsPanel = (
    <div className="space-y-3">
      <SectionSkeleton expanded />
      <SectionSkeleton />
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  );

  const previewPanel = (
    <div className="flex flex-col items-center">
      <div className="w-full bg-white border border-[#EEEDEA] rounded-[14px] p-[18px]">
        <div className="flex items-center justify-between mb-3.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-40 rounded-full" />
        </div>
        <Skeleton className="w-full h-[480px] rounded-xl" />
        <div className="flex justify-center mt-3">
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="mt-4 w-full">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </div>

      {isWideEnough ? (
        <div className="flex flex-row gap-4 items-start">
          <div className="flex-1 min-w-0 pb-12">
            {sectionsPanel}
          </div>
          <div className="w-[380px] flex-shrink-0 sticky top-6">
            {previewPanel}
          </div>
        </div>
      ) : (
        <div>{sectionsPanel}</div>
      )}
    </div>
  );
}
