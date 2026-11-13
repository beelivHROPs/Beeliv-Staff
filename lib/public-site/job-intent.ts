/**
 * Job intent for signup and login: "I pressed Apply on this job". Resolves ANY job in the shared sample list
 * (lib/jobs/shared.ts) by id or name slug, not only the featured ones, so the intent is never lost.
 *
 *  - accepting applications -> the job (carried to /applicant/apply?job=<id> after sign-in)
 *  - closed / filled but still viewable, or unknown -> no job, plus a plain message (the person can still
 *    create an account and browse open roles)
 *
 * Frontend mock. In production the server resolves the slug and re-checks eligibility on submit; the id in
 * the URL is only a hint and never grants access (docs/contracts/public-jobs-frontend-plan.md section 5).
 */
import { findSharedJob } from "@/lib/jobs/shared";
import { sampleDataOn } from "@/lib/env/sample-data";
import { toPublicJob, type Job } from "./jobs";

export interface JobIntent {
  job: Job | null;
  /** Plain message when a job was asked for but cannot be used; null otherwise. */
  notice: string | null;
}

export function resolveJobIntent(raw: string | string[] | undefined): JobIntent {
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (typeof id !== "string" || !id.trim()) return { job: null, notice: null };
  // No sample jobs on a live domain: nothing can be resolved until the real jobs feed exists.
  const found = sampleDataOn() ? findSharedJob(id.slice(0, 120)) : null;
  if (!found || !found.availability.visible) {
    return { job: null, notice: "We could not find that job, so it may have closed. You can still continue and browse open roles." };
  }
  if (!found.availability.accepting) {
    return { job: null, notice: `Applications for ${found.role} have closed. You can still continue and browse open roles.` };
  }
  return { job: toPublicJob(found), notice: null };
}
