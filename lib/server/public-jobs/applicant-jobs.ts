import "server-only";
import { applicantJobFromLive } from "@/lib/applicant/live-jobs";
import type { ApplicantJob } from "@/lib/applicant/jobs";
import { getLivePublicJobs } from "./runtime";

/** Every currently listed REAL vacancy (up to 200) in the approved Applicant screens' shape. Throws if unavailable. */
export async function liveApplicantJobs(): Promise<ApplicantJob[]> {
  const out: ApplicantJob[] = [];
  for (let page = 1; page <= 4; page++) {
    const r = await getLivePublicJobs({ page, limit: 50 });
    out.push(...r.items.map((v) => applicantJobFromLive(v)));
    if (out.length >= r.total || r.items.length < 50) break;
  }
  return out;
}

/** One REAL vacancy by id or slug, or null. Throws if unavailable. */
export async function liveApplicantJob(idOrSlug: string): Promise<ApplicantJob | null> {
  if (!/^[a-zA-Z0-9-]{1,180}$/.test(idOrSlug)) return null;
  const r = await getLivePublicJobs({ lookup: idOrSlug, limit: 1 });
  return r.items[0] ? applicantJobFromLive(r.items[0]) : null;
}
