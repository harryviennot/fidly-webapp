import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function TileSkeleton() {
  return (
    <div className="w-full max-w-[340px] mx-auto space-y-3">
      <Skeleton className="w-full aspect-[300/385] rounded-xl" />
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-5 rounded-md" />
      </div>
      <Skeleton className="h-9 w-full rounded-full" />
    </div>
  );
}

/**
 * Loading state for the card-styles page. Mirrors the real layout (header,
 * active-card hero, then the drafts grid) so the page does not jump on load.
 */
export function TemplatesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72 max-w-[60vw]" />
        </div>
        <Skeleton className="h-9 w-36 rounded-full shrink-0" />
      </div>

      {/* Active card hero */}
      <Card flat className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
          <Skeleton className="w-full max-w-[280px] mx-auto sm:mx-0 sm:w-[300px] aspect-[300/385] rounded-xl shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-64 max-w-full" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-9 w-36 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          </div>
        </div>
      </Card>

      {/* Other styles */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <TileSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
