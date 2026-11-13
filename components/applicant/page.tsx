import type { Metadata } from "next";
import { getApplicantJobs } from "@/lib/applicant/jobs";
import { OverviewBody } from "@/components/applicant/OverviewBody";

export const metadata: Metadata = { title: "Overview" };

export default async function ApplicantOverviewPage() {
  const jobs = await getApplicantJobs();
  return <OverviewBody jobs={jobs} />;
}
