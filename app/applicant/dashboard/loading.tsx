import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/shared/Skeleton";
import { DashboardHeaderSkeleton, MetricTileSkeleton } from "@/components/shared/DashboardLoadingShell";

/** Mirrors app/applicant/dashboard/page.tsx: welcome header, application
 *  summary card, journey stepper, 5 metric tiles, then a 2-column
 *  [required action + helpful info] / [recent activity] split. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl">
      <DashboardHeaderSkeleton />

      <Card className="mb-4">
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-2 h-3 w-64 max-w-full" />
            </div>
            <div className="flex items-center gap-5">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="size-14 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
          <div className="hidden items-start sm:flex">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5 px-2">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <MetricTileSkeleton key={i} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent>
              <Skeleton className="size-11 rounded-full" />
              <Skeleton className="mx-auto mt-3 h-4 w-40" />
              <Skeleton className="mx-auto mt-2 h-3 w-56 max-w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <Skeleton className="mb-3 h-3 w-28" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="mb-3 flex items-start gap-2.5 last:mb-0">
                <Skeleton className="mt-0.5 size-2 shrink-0 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="mt-1.5 h-2.5 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
