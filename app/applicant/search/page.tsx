import type { Metadata } from "next";
import { ApplicantSearchPage } from "@/components/applicant/search/ApplicantSearchPage";
import {publicJobsEnabled} from '@/lib/server/public-jobs/runtime';
import {LiveJobsList,type JobSearchParams} from '@/components/shared/jobs/LiveJobsList';

export const metadata: Metadata = { title: "Search" };

export default async function Page({searchParams}:{searchParams:Promise<JobSearchParams>}) {
  if(publicJobsEnabled())return <LiveJobsList params={await searchParams} applicant/>;
  return <ApplicantSearchPage />;
}
