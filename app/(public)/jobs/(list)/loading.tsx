import { JobsShell } from "@/components/public/jobs/JobsShell";
import { JobsSkeleton } from "@/components/public/jobs/JobsSkeleton";

// Loading skeleton for /jobs (Skel-Jobs-Desktop / Skel-Jobs-Mobile.dc.html):
// the default loaded state (not Jobs-Empty) - same shell as the real page,
// search/sidebar/results swapped for shimmering placeholders.
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="Loading">
      <JobsShell>
        <JobsSkeleton />
      </JobsShell>
    </div>
  );
}
