'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function NotificationsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Notification items skeleton */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
              <div className="ml-12 space-y-3">
                <div>
                  <Skeleton className="h-3 w-12 mb-1" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <div>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-16 w-full rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
