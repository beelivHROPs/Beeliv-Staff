import { Skeleton } from "@/components/shared/Skeleton";

/** Mirrors app/staff/notifications/page.tsx: PageHeading + a single
 *  centered EmptyState-shaped block. */
export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />

      <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="mt-4 h-4 w-40" />
        <Skeleton className="mt-1.5 h-3 w-64 max-w-full" />
      </div>
    </div>
  );
}
