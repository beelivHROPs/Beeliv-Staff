import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApplicantJob } from "@/lib/applicant/jobs";
import { JobUnavailable } from "@/components/applicant/jobs/JobUnavailable";
import { ApplyBody } from "@/components/applicant/ApplyBody";
import { getLivePublicJobs, publicJobsEnabled } from '@/lib/server/public-jobs/runtime';
import { sampleDataOn } from "@/lib/env/sample-data";
import { applicantJobFromLive } from "@/lib/applicant/live-jobs";



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
  if (publicJobsEnabled()) {
    if (!/^[a-zA-Z0-9-]{1,180}$/.test(jobId)) notFound();
    let result;
    try { result = await getLivePublicJobs({ lookup: jobId, limit: 1 }); } catch { return <p role="alert">Jobs are temporarily unavailable. Please try again.</p>; }
    const v = result.items[0];
    if (!v) notFound();
    if (v.availability === "closed") return <JobUnavailable context="apply" />;
    return <ApplyBody key={v.id} job={applicantJobFromLive(v)} />;
  }
  // Real users never get a sample job: with the jobs backend off, there is nothing to apply for yet.
  if (!sampleDataOn()) return <p role="status" className="ap-card mx-auto my-10 max-w-lg rounded-2xl p-6 text-center">There are no open jobs to apply for yet. Please check back soon.</p>;
  // No ?job: the wireframe's default workspace (the Sous Chef draft) while that job is still listed, else the newest job.
  const found = jobId ? await getApplicantJob(jobId) : await getApplicantJob("sous-chef");
  if (!found) notFound();
  // Ended more than 5 days ago: plain "no longer available" state, no draft is created.
  if (!found.visible) return <JobUnavailable context="apply" />;
  const job = found.job;

  return <ApplyBody key={job.id} job={job} />;
}
