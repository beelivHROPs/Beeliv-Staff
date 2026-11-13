import type { Metadata } from "next";
import { LoginForm, type LoginPreview } from "@/components/public/auth/LoginForm";
import { parsePortal, safeNextPath } from "@/lib/auth/portals";
import { resolveJobIntent } from "@/lib/public-site/job-intent";
import {publicJobsEnabled} from '@/lib/server/public-jobs/runtime';
import {resolveLiveJobIntent} from '@/lib/server/public-jobs/intent';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export const metadata: Metadata = { title: "Log in" };

const PREVIEWS: readonly LoginPreview[] = ["wrong", "unverified", "limited", "error", "session-expired"];

/**
 * /login                  = general log in (Applicant / Staff talent app).
 * /login?portal=client|staff|admin = the same form framed for that app.
 * /login?next=/path       = same-site return URL (validated; never an open redirect).
 * /login?job=id           = reached from a job's "Apply Now"; the vacancy is
 *                           preserved through authentication (unknown or closed job: plain message).
 * /login?state=...        = MOCK preview of a sign-in state (wrong, unverified,
 *                           limited, error, session-expired). Remove with lib/auth/mock.ts.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { job, notice } = publicJobsEnabled()?await resolveLiveJobIntent(sp.job):resolveJobIntent(sp.job);
  const jobId = job?.id ?? null;
  const portal = parsePortal(sp.portal);
  const next = safeNextPath(sp.next);
  const s = sp.state;
  const preview = PREVIEWS.find((p) => p === s) ?? null;
  return <LoginForm jobId={jobId} portal={portal} next={next} preview={preview} jobNotice={notice} />;
}
