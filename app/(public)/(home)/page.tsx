import type { Metadata } from "next";
import { HomeBody } from "@/components/public/HomeBody";
import { MenuProvider, StickyBar } from "@/components/public/SiteHeader";
import { HERO } from "@/lib/public-site/content";
import { getFeaturedApplicantJobs } from "@/lib/applicant/jobs";
import { sampleDataOn } from "@/lib/env/sample-data";
import {getLivePublicJobs,publicJobsEnabled} from '@/lib/server/public-jobs/runtime';
import {toLiveJobDisplay} from '@/lib/jobs/live-display';

export const metadata: Metadata = {
  title: { absolute: "Beeliv Hospitality" },
  description: HERO.body,
};

// Featured jobs depend on today's date, so the page is rendered per request.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Featured = the newest open jobs from the shared sample list; swap for the public jobs projection later.
  let jobs:Parameters<typeof HomeBody>[0]['jobs']=[],jobsUnavailable=false;
  if(publicJobsEnabled()){
    try{const result=await getLivePublicJobs({featured:true,limit:4});jobs=result.items.map(job=>toLiveJobDisplay(job,result.asOf));}catch{jobsUnavailable=true;}
  }else if(sampleDataOn())jobs=await getFeaturedApplicantJobs(4);
  return (
    <MenuProvider>
      <StickyBar sentinelId="ps-hero-end" />
      <HomeBody jobs={jobs} jobsUnavailable={jobsUnavailable} />
    </MenuProvider>
  );
}
