import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/shared/Skeleton";
import { DashboardHeaderSkeleton, DashboardMetricsRowSkeleton } from "@/components/shared/DashboardLoadingShell";

/** Mirrors app/staff/dashboard/page.tsx: header, 4 metric tiles, then
 *  Upcoming Shifts + Notices beside Documentation Status + Quick Actions. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl">
      <DashboardHeaderSkeleton />
      <DashboardMetricsRowSkeleton />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent>
              <div className="mb-2.5 flex items-center justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 border-b border-border pb-2.5 last:border-0 last:pb-0"
                  style={{ marginBottom: i === 0 ? "0.625rem" : 0 }}
                >
                  <div>
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="mt-1.5 h-2.5 w-20" />
                  </div>
                  <Skeleton className="h-2.5 w-14" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Skeleton className="mb-2.5 h-3 w-20" />
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 border-b border-border pb-2.5 last:border-0 last:pb-0"
                  style={{ marginBottom: i < 2 ? "0.625rem" : 0 }}
                >
                  <Skeleton className="mt-0.5 size-3.5 shrink-0 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-40 max-w-full" />
                    <Skeleton className="mt-1.5 h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent>
              <div className="mb-2.5 flex items-center justify-between">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="mt-3 h-3 w-24" />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Skeleton className="mb-2.5 h-3 w-24" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="mt-2 h-9 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
