import { SKELETON_JOBS } from "@/lib/public-site/jobs";
import { PublicJobCard } from "./PublicJobCard";

/**
 * Loading skeleton for the search + sidebar + results area. Same grid as the live list
 * (components/shared/jobs/JobsExplorer, which is also the Applicant Find Jobs layout): search bar,
 * 260/300px filter column, count + sort row, then the real job card (its photo and chips shimmer
 * under `.skel`, see app/(public)/public-site.css).
 */
function Block({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse bg-(--ap-line-2) ${className}`} />;
}

export function JobsSkeleton() {
  return (
    <section
      aria-busy="true"
      className="jc-public mx-auto max-w-[calc(1440*var(--u))] px-[18px] pt-3 pb-16 max-[380px]:px-3.5 wf-d:px-[calc(96*var(--u))] wf-d:pb-[calc(110*var(--u))]"
    >
      <p role="status" className="sr-only">
        Loading
      </p>

      <div className="mb-4 flex flex-col gap-3 min-[768px]:hidden">
        <Block className="h-[105px] rounded-[18px]" />
        <div className="flex gap-2">
          <Block className="size-11 shrink-0 rounded-full" />
          <Block className="h-11 w-28 rounded-full" />
          <Block className="h-11 w-28 rounded-full" />
        </div>
      </div>
      <div className="mb-[22px] hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] gap-2.5 rounded-[18px] border border-(--ap-line) bg-white p-2.5 min-[768px]:grid max-[1040px]:grid-cols-[minmax(0,1fr)_auto_auto]">
        <Block className="h-[52px] rounded-[14px]" />
        <Block className="h-[52px] rounded-[14px] max-[1040px]:hidden" />
        <Block className="h-[52px] w-[60px] rounded-full min-[1041px]:hidden" />
        <Block className="h-[52px] w-32 rounded-full" />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 min-[1041px]:grid-cols-[260px_minmax(0,1fr)] min-[1241px]:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="max-[1040px]:hidden">
          <div className="rounded-[20px] border border-(--ap-line) bg-white p-6">
            <Block className="h-7 w-24 rounded-lg" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="mt-5">
                <Block className="h-4 w-24 rounded-md" />
                <Block className="mt-3 h-[52px] w-full rounded-[14px]" />
              </div>
            ))}
          </div>
        </aside>
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Block className="h-5 w-32 rounded-md" />
            <Block className="h-10 w-36 rounded-xl" />
          </div>
          <div className="flex flex-col gap-3.5">
            {SKELETON_JOBS.map((job) => (
              <PublicJobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
