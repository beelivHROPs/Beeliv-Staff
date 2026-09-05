import { Skeleton } from "@/components/shared/Skeleton";

/** Mirrors app/staff/documentation/page.tsx: PageHeading + one Card with a
 *  title and a single label+badge row — this page's entire content. */
export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-56 max-w-full" />

      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <Skeleton className="mb-2 h-3 w-40" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
