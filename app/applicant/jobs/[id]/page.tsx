import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApplicantJob } from "@/lib/applicant/jobs";
import { JobUnavailable } from "@/components/applicant/jobs/JobUnavailable";
import { JobBody } from "@/components/applicant/JobBody";
import { getLivePublicJobs, publicJobsEnabled } from "@/lib/server/public-jobs/runtime";
import { LiveJobDetail } from "@/components/shared/jobs/LiveJobDetail";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  if(publicJobsEnabled()) {
    if(!/^[a-zA-Z0-9-]{1,180}$/.test(id)) return {title:'Job not found'};
    try{return {title:(await getLivePublicJobs({lookup:id,limit:1})).items[0]?.title??'Job not found'};}catch{return {title:'Jobs temporarily unavailable'};}
  }
  const found = await getApplicantJob(id);
  return { title: found?.visible ? found.job.role : "Job not found" };
}

export default async function ApplicantJobDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  if(publicJobsEnabled()) {
    if(!/^[a-zA-Z0-9-]{1,180}$/.test(id))notFound();
    let result;try{result=await getLivePublicJobs({lookup:id,limit:1});}catch{return <p role="alert">Jobs are temporarily unavailable. Please try again.</p>;}
    const job=result.items[0];if(!job)notFound();
    return <LiveJobDetail job={job} applicant/>;
  }
  const found = await getApplicantJob(id);
  if (!found) notFound();
  // Ended more than 5 days ago: not shown any more (the person's own applications stay in My Applications).
  if (!found.visible) return <JobUnavailable />;
  return <JobBody job={found.job} />;
}
