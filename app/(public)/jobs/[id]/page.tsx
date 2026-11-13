import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobDetailBody } from "@/components/public/JobDetail";
import { sampleDataOn } from "@/lib/env/sample-data";
import { findPublicJob, listPublicJobIds } from "@/lib/public-site/job-lookup";
import { getLivePublicJobs, publicJobsEnabled } from "@/lib/server/public-jobs/runtime";
import { LiveJobDetail } from "@/components/shared/jobs/LiveJobDetail";
import { PageHeader } from "@/components/public/PageHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { MenuProvider } from "@/components/public/SiteHeader";

type Params = Promise<{ id: string }>;

// Real 404 STATUS: the root loading.tsx streams every dynamic page as 200, so a notFound() call alone only shows the
// not-found screen. Instead only the jobs that are public TODAY (open, closing soon, or closed within the last
// 5 days) are listed here and anything else is rejected at routing. The list is worked out when the server
// builds or starts, so a long-running mock server needs a restart to move a job out of its window; the backend
// replaces this with a per-request availability result (docs/contracts/public-jobs-frontend-plan.md section 3).
export const dynamicParams = true;
export const dynamic = 'force-dynamic';
export async function generateStaticParams() {
  if (publicJobsEnabled()) return [];
  if (!sampleDataOn()) return [];
  return (await listPublicJobIds()).map((id) => ({ id }));
}

// Sample-data-only for now: a job resolves while it is open, closing soon, or closed within the last 5 days
// (lib/jobs/status.ts). Anything else (older, unknown) is a real 404. In production the same rule is computed by the
// backend per request; prerendered mock pages would otherwise keep a job past its window. Swap for a real lookup
// once a jobs API/query exists - nothing else on this page changes.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  if (publicJobsEnabled()) {
    if (!/^[a-zA-Z0-9-]{1,180}$/.test(id)) return {title:'Job not found'};
    try {const job=(await getLivePublicJobs({lookup:id,limit:1})).items[0];return {title:job?.title??'Job not found',...(job?.availability==='closed'?{robots:{index:false,follow:true}}:{})};}
    catch {return {title:'Jobs temporarily unavailable',robots:{index:false,follow:true}};}
  }
  const found = sampleDataOn() ? await findPublicJob(id) : null;
  if (!found) return { title: "Job not found" };
  // A closed job stays viewable for 5 days but should not be indexed.
  return { title: found.job.role, ...(found.job.closed ? { robots: { index: false, follow: true } } : {}) };
}

export default async function JobDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  if (publicJobsEnabled()) {
    if (!/^[a-zA-Z0-9-]{1,180}$/.test(id)) notFound();
    let result;
    try {result=await getLivePublicJobs({lookup:id,limit:1});}
    catch {return <MenuProvider><PageHeader activeHref="/jobs"/><main className="mx-auto max-w-5xl px-4 py-12"><p role="alert">Jobs are temporarily unavailable. Please try again.</p></main><SiteFooter/></MenuProvider>;}
    const job=result.items[0];if(!job)notFound();
    return <MenuProvider><PageHeader activeHref="/jobs"/><LiveJobDetail job={job}/><SiteFooter/></MenuProvider>;
  }
  const found = sampleDataOn() ? await findPublicJob(id) : null;
  if (!found) notFound();
  return <JobDetailBody job={found.job} related={found.related} />;
}
