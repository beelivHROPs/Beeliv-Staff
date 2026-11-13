import { notFound } from "next/navigation";
import { getApplicantJobs } from "@/lib/applicant/jobs";
import { HomePreview } from "@/components/design-preview/applicant-home/HomePreview";

/**
 * ISOLATED DESIGN PREVIEW (dev only). Compares two phone layouts for the
 * Applicant Home. Touches no real screen: reads the same mock data helpers
 * read-only. Returns 404 in production builds.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ o?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { o } = await searchParams;
  const jobs = await getApplicantJobs();
  const initial = o === "b" ? "b" : o === "current" ? "current" : "a";
  return <HomePreview jobs={jobs} initial={initial} />;
}
