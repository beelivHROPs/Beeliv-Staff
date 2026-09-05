import { Skeleton } from "@/components/shared/Skeleton";

/** Mirrors app/applicant/help/page.tsx: a single centered EmptyState-shaped
 *  block (icon + title + description), no page heading — this page never
 *  has one either. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="mt-4 h-4 w-40" />
        <Skeleton className="mt-1.5 h-3 w-72 max-w-full" />
      </div>
    </div>
  );
}
