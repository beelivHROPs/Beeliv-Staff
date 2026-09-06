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

/**
 * Hero row for the 3 dashboards redesigned with a HeroStatCard + donut
 * ring (HR, Ops, Client) — DashboardHeaderSkeleton above is now stale for
 * these three (it mirrors the flat .bg-brand-wash header those pages no
 * longer have; Applicant/Staff still use that header, so it stays correct
 * there). Without this, the loading state showed no hero/ring placeholder
 * at all, then the real redesigned content popped in with a completely
 * different shape — the "previous skeleton...overlaps the current design"
 * mismatch.
 */
export function DashboardHeroRowSkeleton() {
  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] px-5 py-5 sm:px-6 sm:py-6">
        <Skeleton className="h-3 w-48 bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)]" />
        <Skeleton className="mt-2 h-5 w-32 bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)]" />
        <Skeleton className="mt-3 h-9 w-20 bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)]" />
        <Skeleton className="mt-1.5 h-4 w-24 bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)]" />
        <Skeleton className="mt-3 h-6 w-40 rounded-full bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)]" />
      </div>
      <Card>
        <CardContent className="flex h-full flex-col items-center justify-center gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="size-26 rounded-full" />
          <Skeleton className="h-3 w-28" />
        </CardContent>
      </Card>
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
