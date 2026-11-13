"use server";

import { visibleSharedJobs } from "@/lib/jobs/shared";
import { sampleDataOn } from "@/lib/env/sample-data";
import type { SearchResult } from "./search";
import {getLivePublicJobs,publicJobsEnabled} from '@/lib/server/public-jobs/runtime';

/**
 * Job part of the public-site search, as a SERVER ACTION so the sample job list never ships in browser JS.
 * Returns nothing when sample data is off (live domains) until the real jobs feed exists.
 * Built per search so the date rules (a closed job drops off after 5 days) apply against today.
 */
export async function searchJobs(query: string): Promise<SearchResult[]> {
  const q = String(query).trim().toLowerCase().slice(0, 120);
  if(publicJobsEnabled()) {
    if(!q)return [];
    const result=await getLivePublicJobs({search:q,featured:true,limit:20});
    return result.items.map(job=>({id:`job-${job.id}`,type:'job' as const,title:job.title,subtitle:`${job.companyName} · ${job.location}`,href:`/jobs/${job.slug}`}));
  }
  if (!q || !sampleDataOn()) return [];
  return visibleSharedJobs()
    .filter((j) => j.availability.accepting)
    .filter((j) => [j.role, j.company, j.location].join(" ").toLowerCase().includes(q))
    .map((j) => ({ id: `job-${j.id}`, type: "job" as const, title: j.role, subtitle: `${j.company} · ${j.location}`, href: `/jobs/${j.id}` }));
}
