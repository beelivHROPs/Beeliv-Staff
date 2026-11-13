/**
 * Public job lookup for /jobs/[id] (SAMPLE DATA, no database yet).
 *
 * Reads the ONE shared job list (lib/jobs/shared.ts). A job is available while it is open, closing soon, or
 * ended within the last 5 days (shown as "closed", no Apply). After that the page is a real 404.
 */
import { getApplicantJob, getApplicantJobs, type ApplicantJob } from "@/lib/applicant/jobs";
import { visibleSharedJobs } from "@/lib/jobs/shared";

export async function findPublicJob(idOrSlug: string): Promise<{ job: ApplicantJob; related: ApplicantJob[] } | null> {
  const found = await getApplicantJob(idOrSlug);
  if (!found || !found.visible) return null;
  const { job } = found;
  // Similar roles: still open, same department first, then newest.
  const open = (await getApplicantJobs()).filter((j) => j.id !== job.id && !j.closed);
  const same = open.filter((j) => j.department === job.department);
  const related = [...same, ...open.filter((j) => !same.includes(j))].slice(0, 3);
  return { job, related };
}

/** Ids the public detail page may serve right now (everything else is a real 404 at routing). */
export async function listPublicJobIds(): Promise<string[]> {
  return visibleSharedJobs().map((j) => j.id);
}
