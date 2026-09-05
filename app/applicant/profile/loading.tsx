import { Skeleton } from "@/components/shared/Skeleton";

/** Mirrors app/applicant/profile/page.tsx: PageHeading (h1 text-xl, mb-6,
 *  mt-1 description) + a two-column grid — the main form card (2 half-width
 *  fields, 2 full-width fields, a button row) beside a narrower identity
 *  card (avatar + name + caption). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-1 h-3.5 w-56 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-1.5 h-9 w-full rounded-md" />
            </div>
            <div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-1.5 h-9 w-full rounded-md" />
            </div>
          </div>
          <div className="mt-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-1.5 h-9 w-full rounded-md" />
          </div>
          <div className="mt-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-1.5 h-9 w-full rounded-md" />
          </div>
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 sm:w-64">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div>
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="mt-1.5 h-3 w-28" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
