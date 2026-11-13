import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApplicantJob } from "@/lib/applicant/jobs";
import { JobUnavailable } from "@/components/applicant/jobs/JobUnavailable";
import { ApplyBody } from "@/components/applicant/ApplyBody";

export const metadata: Metadata = { title: "Application" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * /applicant/apply?job=<id> — resumes that vacancy's existing draft or
 * starts one (resolved client-side in ApplyBody via the mock service, which
 * is localStorage-backed). With no ?job the wireframe's own default
 * workspace (the Sous Chef draft) opens; an unknown id is a 404 rather than
 * silently starting an application for a different job.
 */
export default async function ApplicantApplyPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).job;
  const jobId = typeof raw === "string" ? raw : "";
  // No ?job: the wireframe's default workspace (the Sous Chef draft) while that job is still listed, else the newest job.
  const found = jobId ? await getApplicantJob(jobId) : await getApplicantJob("sous-chef");
  if (!found) notFound();
  // Ended more than 5 days ago: plain "no longer available" state, no draft is created.
  if (!found.visible) return <JobUnavailable context="apply" />;
  const job = found.job;

  return <ApplyBody key={job.id} job={job} />;
}
