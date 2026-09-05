import { Skeleton } from "@/components/shared/Skeleton";

/** Mirrors app/staff/notifications/page.tsx: PageHeading (h1 text-xl,
 *  mb-6, no description) + a single centered EmptyState-shaped block
 *  (104x104 illustration, max-w-sm description). */
export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-6 w-32" />
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
        <Skeleton className="h-[104px] w-[104px] rounded-full" />
        <Skeleton className="mt-4 h-3.5 w-36" />
        <Skeleton className="mt-1 h-3 w-full max-w-sm" />
      </div>
    </div>
  );
}
