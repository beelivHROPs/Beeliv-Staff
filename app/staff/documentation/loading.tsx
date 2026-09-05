import { Skeleton } from "@/components/shared/Skeleton";

/** Mirrors app/staff/documentation/page.tsx: PageHeading (h1 text-xl,
 *  mb-6, no description here) + one Card (components/shared/Card.tsx —
 *  title as mb-2 text-sm) with a single label+badge row — this page's
 *  entire content. */
export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-6 w-56 max-w-full" />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="mb-2 h-3.5 w-40" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
