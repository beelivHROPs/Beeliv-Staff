import type { Metadata } from "next";
import { PublicJobsExplorer } from "@/components/public/jobs/PublicJobsExplorer";
import { filtersFromParams } from "@/components/applicant/jobs/filters";
import { JobsShell } from "@/components/public/jobs/JobsShell";
import { JOBS_HERO } from "@/lib/public-site/jobs-content";
import { getApplicantJobs } from "@/lib/applicant/jobs";
import { sampleDataOn } from "@/lib/env/sample-data";
import { RolesSoon } from "@/components/public/jobs/RolesSoon";
import { publicJobsEnabled } from "@/lib/server/public-jobs/runtime";
import { LiveJobsList } from "@/components/shared/jobs/LiveJobsList";

export const metadata: Metadata = {
  title: "Find Jobs",
  description: JOBS_HERO.body,
};

/**
 * /jobs: hospitality job listings (Jobs-Desktop / Jobs-Mobile.dc.html).
 */
// Dates and states are worked out per request (a closed job drops off after 5 days), so this page is not prerendered.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  if (publicJobsEnabled()) return <JobsShell><LiveJobsList params={await searchParams}/></JobsShell>;
  // The ONE shared sample list (lib/jobs/shared.ts): open, closing soon, or closed within 5 days. Swap for the
  // single public jobs projection later - nothing here changes.
  // No sample jobs on a live domain until the real jobs feed exists (lib/env/sample-data.ts).
  const jobs = sampleDataOn() ? await getApplicantJobs() : [];
  // Same filter parameters as the Applicant Find Jobs page (?q=&loc=&dept=&type=&exp=&pay=&shift=&posted=&sort=&saved=1).
  const { filters, saved } = filtersFromParams(await searchParams);
  return (
    <JobsShell>
      {sampleDataOn() ? <PublicJobsExplorer key={`${filters.q}|${saved}`} jobs={jobs} initialFilters={filters} initialSaved={saved} /> : <RolesSoon />}
    </JobsShell>
  );
}
