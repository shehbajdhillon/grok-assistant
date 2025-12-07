'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AssistantCardSkeleton() {
  return (
    <Card className="border-border/50 bg-card/50 p-5">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        {/* Name */}
        <Skeleton className="h-6 w-3/4" />

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14 rounded-md" />
            <Skeleton className="h-5 w-12 rounded-md" />
          </div>
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
    </Card>
  );
}
