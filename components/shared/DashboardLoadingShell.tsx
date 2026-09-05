import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/shared/Skeleton";

/**
 * Shared chrome for the 5 role-dashboard loading states — NOT a return to
 * "one skeleton for everything." Every dashboard (applicant, staff, HR,
 * client, ops) genuinely shares this exact welcome-banner + 4-metric-tile
 * shape in the real, rendered pages (bg-brand-wash header, MetricCard grid)
 * — reusing it here mirrors reality rather than genericizing it away. What
 * follows below this shell in each dashboard's own loading.tsx (the card
 * layout underneath) is bespoke per page, since that part is genuinely
 * different — warnings list vs. shift list vs. staff table vs. recruitment
 * pipeline bars.
 */
export function DashboardHeaderSkeleton() {
  return (
    <div className="bg-brand-wash mb-5 rounded-2xl px-4 py-5 sm:px-6">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-2 h-7 w-56" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
    </div>
  );
}

export function MetricTileSkeleton() {
  return (
    <Card size="sm" className="border-border/80">
      <CardContent>
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-3.5 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="mt-2 h-6 w-12" />
        <Skeleton className="mt-1.5 h-3 w-20" />
      </CardContent>
    </Card>
  );
}

export function DashboardMetricsRowSkeleton() {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <MetricTileSkeleton key={i} />
      ))}
    </div>
  );
}
