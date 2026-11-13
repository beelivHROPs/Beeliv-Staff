/**
 * Loading shape for Interviews & Assessments: page title, the two-way tabs, the big "next interview" ticket and a
 * smaller row under it. Same approved style as the other Applicant skeletons (solid pulsing tiles, one solid box per
 * card at its real size). Server component, no state. Used by app/applicant/interviews/loading.tsx.
 */
function Sk({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`ap-shimmer ${className}`} />;
}

export function InterviewsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading Interviews">
      <h1 className="sr-only">Interviews & Assessments</h1>
      {/* Title (hidden on phones, where the top bar carries it) */}
      <div className="pt-3 pb-5 max-[767px]:hidden">
        <Sk className="h-11 w-72 max-w-full rounded-xl" />
      </div>
      {/* Upcoming / Past tabs */}
      <Sk className="mt-1 h-[52px] w-full rounded-full min-[768px]:w-[260px]" />
      <div className="mt-5 flex max-w-[760px] flex-col gap-6">
        {/* Next interview ticket */}
        <Sk className="h-[520px] w-full rounded-[24px] min-[768px]:h-[460px]" />
        {/* A later interview row */}
        <div>
          <Sk className="mb-3 h-3.5 w-24 rounded-md" />
          <Sk className="h-[132px] w-full rounded-[24px]" />
        </div>
      </div>
    </div>
  );
}
