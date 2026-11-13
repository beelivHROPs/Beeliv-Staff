import type { Metadata } from "next";
import { getApplicantJobs } from "@/lib/applicant/jobs";
import { OverviewBody } from "@/components/applicant/OverviewBody";
import {publicJobsEnabled} from '@/lib/server/public-jobs/runtime';
import {LiveJobsList} from '@/components/shared/jobs/LiveJobsList';

export const metadata: Metadata = { title: "Overview" };

export default async function ApplicantOverviewPage() {
  if(publicJobsEnabled())return <><h1 className="text-3xl font-semibold">Find your next role</h1><LiveJobsList params={{}} applicant/></>;
  const jobs = await getApplicantJobs();
  return <OverviewBody jobs={jobs} />;
}
