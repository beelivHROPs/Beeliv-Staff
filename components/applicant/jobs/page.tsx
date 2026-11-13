import type { Metadata } from "next";
import { getApplicantJobs } from "@/lib/applicant/jobs";
import { JobsBody } from "@/components/applicant/JobsBody";
import { filtersFromParams } from "@/components/applicant/jobs/filters";

export const metadata: Metadata = { title: "Find Jobs" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ApplicantJobsPage({ searchParams }: { searchParams: SearchParams }) {
  const jobs = await getApplicantJobs();
  const { filters, saved } = filtersFromParams(await searchParams);
  // Keyed on the query + list so a new top-bar search (router.push ?q=) or a
  // ?saved=1 deep link re-initialises the page state; in-page filter changes
  // only rewrite the URL (history.replaceState) and never remount.
  return <JobsBody key={`${filters.q}|${saved}`} jobs={jobs} initialFilters={filters} initialSaved={saved} />;
}
