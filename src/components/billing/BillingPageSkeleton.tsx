"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

function TierCardSkeleton() {
  return (
    <Card hover={false} className="flex flex-col">
      <CardHeader className="pb-2">
        {/* Tier name */}
        <Skeleton className="h-5 w-20" />
        {/* Price */}
        <div className="flex items-baseline gap-1.5 mt-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-8" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-2">
        {/* Features label */}
        <Skeleton className="h-3 w-36 mb-3" />
        {/* Feature lines */}
        <div className="space-y-2.5">
          {[75, 90, 65, 85, 70].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded shrink-0" />
              <Skeleton className="h-3.5" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Skeleton className="h-9 w-full rounded-full" />
      </CardFooter>
    </Card>
  );
}

export function BillingPageSkeleton() {
  return (
    <div className="space-y-8 pb-12">
      {/* Subscription info card */}
      <Card hover={false}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </CardContent>
      </Card>

      {/* Plans section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TierCardSkeleton />
          <TierCardSkeleton />
          <TierCardSkeleton />
        </div>
      </div>

      {/* Invoice section */}
      <Card hover={false}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-8 w-32 rounded-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
