import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApplicantJob } from "@/lib/applicant/jobs";
import { sampleDataOn } from "@/lib/env/sample-data";
import { JobUnavailable } from "@/components/applicant/jobs/JobUnavailable";
import { JobBody } from "@/components/applicant/JobBody";
import { publicJobsEnabled } from "@/lib/server/public-jobs/runtime";
import { liveApplicantJob } from "@/lib/server/public-jobs/applicant-jobs";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  if (publicJobsEnabled()) {
    try { return { title: (await liveApplicantJob(id))?.role ?? "Job not found" }; } catch { return { title: "Jobs temporarily unavailable" }; }
  }
  const found = sampleDataOn() ? await getApplicantJob(id) : null;
  return { title: found?.visible ? found.job.role : "Job not found" };
}

export default async function ApplicantJobDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  if (publicJobsEnabled()) {
    let job;
    try { job = await liveApplicantJob(id); } catch { return <p role="alert">Jobs are temporarily unavailable. Please try again.</p>; }
    if (!job) notFound();
    return <JobBody job={job} />; // the approved job design, real vacancy
  }
  const found = sampleDataOn() ? await getApplicantJob(id) : null; // real users never see a sample job
  if (!found) notFound();
  // Ended more than 5 days ago: not shown any more (the person's own applications stay in My Applications).
  if (!found.visible) return <JobUnavailable />;
  return <JobBody job={found.job} />;
}
