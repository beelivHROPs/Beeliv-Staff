import { Skeleton } from "@/components/shared/Skeleton";

/** Mirrors app/applicant/help/page.tsx: a single centered EmptyState-shaped
 *  block (components/shared/EmptyState.tsx) — no page heading, this page
 *  never has one either. Illustration is 104x104 there, not a generic size;
 *  description uses max-w-sm, not an arbitrary width. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
        <Skeleton className="h-[104px] w-[104px] rounded-full" />
        <Skeleton className="mt-4 h-3.5 w-40" />
        <Skeleton className="mt-1 h-3 w-full max-w-sm" />
      </div>
    </div>
  );
}
