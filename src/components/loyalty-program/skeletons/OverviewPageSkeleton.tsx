'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function OverviewPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Active card + stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active card widget skeleton */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-full" />
              <Skeleton className="h-9 flex-1 rounded-full" />
            </div>
          </CardContent>
        </Card>

        {/* Stats grid skeleton */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Status indicators skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
