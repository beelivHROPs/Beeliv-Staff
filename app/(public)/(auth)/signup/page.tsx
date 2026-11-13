import type { Metadata } from "next";
import { SignupForm } from "@/components/public/auth/SignupForm";
import { resolveJobIntent } from "@/lib/public-site/job-intent";
import {publicJobsEnabled} from '@/lib/server/public-jobs/runtime';
import {resolveLiveJobIntent} from '@/lib/server/public-jobs/intent';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * /signup        = general sign up.
 * /signup?job=id = job-application variant. The job is looked up in the ONE shared sample list
 * (lib/jobs/shared.ts) by id or name slug, so every public job works, not just the featured ones. An unknown
 * or closed job falls back to the general variant with a plain message.
 */

// Static on purpose: a generateMetadata that reads searchParams suspends above
// this route's own loading.tsx, so the parent (Home) skeleton would flash.
export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw=(await searchParams).job;
  const { job, notice } = publicJobsEnabled()?await resolveLiveJobIntent(raw):resolveJobIntent(raw);
  return <SignupForm job={job} jobNotice={notice} />;
}
