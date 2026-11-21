import type { Metadata } from "next";
import { getApplicantJobs, type ApplicantJob } from "@/lib/applicant/jobs";
import { sampleDataOn } from "@/lib/env/sample-data";
import { OverviewBody } from "@/components/applicant/OverviewBody";
import { publicJobsEnabled } from "@/lib/server/public-jobs/runtime";
import { liveApplicantJobs } from "@/lib/server/public-jobs/applicant-jobs";

export const metadata: Metadata = { title: "Overview" };

/** The approved Home design always. Jobs: real vacancies when the jobs backend is on; sample only in preview; else none. */
export default async function ApplicantOverviewPage() {
  let jobs: ApplicantJob[] = [];
  if (publicJobsEnabled()) {
    try { jobs = await liveApplicantJobs(); } catch { jobs = []; }
  } else if (sampleDataOn()) jobs = await getApplicantJobs();
  return <OverviewBody jobs={jobs} />;
}
