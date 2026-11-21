import type { Metadata } from "next";
import { getApplicantJobs, type ApplicantJob } from "@/lib/applicant/jobs";
import { sampleDataOn } from "@/lib/env/sample-data";
import { JobsBody } from "@/components/applicant/JobsBody";
import { filtersFromParams } from "@/components/applicant/jobs/filters";
import { publicJobsEnabled } from "@/lib/server/public-jobs/runtime";
import { liveApplicantJobs } from "@/lib/server/public-jobs/applicant-jobs";

export const metadata: Metadata = { title: "Find Jobs" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** The approved Jobs design always. Real vacancies when the jobs backend is on; sample only in preview; else none. */
export default async function ApplicantJobsPage({ searchParams }: { searchParams: SearchParams }) {
  let jobs: ApplicantJob[] = [];
  if (publicJobsEnabled()) {
    try { jobs = await liveApplicantJobs(); } catch { jobs = []; }
  } else if (sampleDataOn()) jobs = await getApplicantJobs();
  const { filters, saved } = filtersFromParams(await searchParams);
  // Keyed on the query + list so a new top-bar search (router.push ?q=) or a
  // ?saved=1 deep link re-initialises the page state; in-page filter changes
  // only rewrite the URL (history.replaceState) and never remount.
  return <JobsBody key={`${filters.q}|${saved}`} jobs={jobs} initialFilters={filters} initialSaved={saved} />;
}
