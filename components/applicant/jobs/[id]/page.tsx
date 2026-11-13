import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApplicantJob } from "@/lib/applicant/jobs";
import { JobUnavailable } from "@/components/applicant/jobs/JobUnavailable";
import { JobBody } from "@/components/applicant/JobBody";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const found = await getApplicantJob(id);
  return { title: found?.visible ? found.job.role : "Job not found" };
}

export default async function ApplicantJobDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const found = await getApplicantJob(id);
  if (!found) notFound();
  // Ended more than 5 days ago: not shown any more (the person's own applications stay in My Applications).
  if (!found.visible) return <JobUnavailable />;
  return <JobBody job={found.job} />;
}
