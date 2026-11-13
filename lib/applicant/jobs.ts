/**
 * Applicant "Find Jobs" listings, FRONTEND-ONLY SAMPLE DATA.
 *
 * Every job comes from the ONE shared list (lib/jobs/shared.ts), the same list the public site and the Admin
 * vacancy mock use, so a job has one id, one posted date and one close date everywhere. Its open / closing
 * soon / closed state is computed from the close date (lib/jobs/status.ts). Jobs that ended more than 5 days
 * ago are not listed and their page says "no longer available".
 *
 * `image: null` = department art instead of a photo (components/applicant/primitives.tsx JobThumb).
 * Each job is merged with its per-vacancy detail from lib/public-site/job-details.ts (SAMPLE content);
 * `pay` is derived from its public salary so the card chip and the detail page can never disagree.
 */
import type { Department, Job } from "@/lib/public-site/jobs";
import { asksDocuments, testFormIdForJob } from "@/lib/journeys/applicant";
import { jobDetailsFor, payChipLabel, type JobDetails } from "@/lib/public-site/job-details";
import { featuredSharedJobs, findSharedJob, visibleSharedJobs, type Match, type Shift, type SharedJob } from "@/lib/jobs/shared";
import { closesLabel, postedLabel, type JobState } from "@/lib/jobs/status";

export type { Match, Shift };

export type ApplicantJob = Omit<Job, "image" | "postedDaysAgo" | "state" | "closesOn"> & JobDetails & {
  image: { src: string; alt: string } | null;
  shift: Shift;
  /** Short public pay line for chips, e.g. "₦250k – ₦320k / month"; null = not published. */
  pay: string | null;
  /** Days since posted - drives sort and the "Posted ..." label. */
  daysAgo: number;
  /** Card line: "Closes 30 Oct 2026", "Closed 2 days ago". */
  closes: string;
  match: Match | null;
  /** Computed from the close date (lib/jobs/status.ts), never hand-set. */
  state: JobState;
  /** Applications no longer accepted (closed or filled). */
  closed?: boolean;
  /** Whole days since the job ended (0 while open). */
  daysSinceEnd: number;
  /** A test the vacancy carries, taken as part of the application (from the vacancy's testFormId). */
  testFormId?: string;
};

function build(j: SharedJob): ApplicantJob {
  // Documents and the test follow THIS job's own journey (lib/journeys): a step the journey does not have asks for nothing.
  const base = jobDetailsFor(j.id, j.department);
  const asks = asksDocuments({ id: j.id, role: j.role, department: j.department });
  const details: JobDetails = { ...base, requiredDocuments: { atApplication: asks.atApplication ? base.requiredDocuments.atApplication : [], afterSelection: asks.afterSelection ? base.requiredDocuments.afterSelection : [] } };
  const a = j.availability;
  return {
    id: j.id,
    role: j.role,
    company: j.company,
    location: j.location,
    employmentType: j.employmentType,
    department: j.department,
    image: j.image,
    shift: j.shift,
    match: j.match,
    ...details,
    pay: payChipLabel(details.salary),
    daysAgo: j.postedDaysAgo,
    closes: closesLabel(a, j.closesOn),
    state: a.state,
    closed: !a.accepting,
    daysSinceEnd: a.daysSinceEnd,
    postedLabel: postedLabel(j.postedDaysAgo),
    href: `/applicant/jobs/${j.id}`,
    testFormId: testFormIdForJob({ id: j.id, role: j.role, department: j.department }),
  };
}

/** Jobs an applicant may see: open, closing soon, or ended within the 5-day window (same list as the public site). */
export async function getApplicantJobs(): Promise<ApplicantJob[]> {
  return visibleSharedJobs().map(build);
}

/** One job by id/slug. `visible` false = it exists but is past the 5-day window ("no longer available"); null = unknown id. */
export async function getApplicantJob(idOrSlug: string): Promise<{ job: ApplicantJob; visible: boolean } | null> {
  const j = findSharedJob(idOrSlug);
  return j ? { job: build(j), visible: j.availability.visible } : null;
}

/** The newest open jobs (Home "featured" and the Applicant home "roles for you"): newest posted first, accepting applications. */
export async function getFeaturedApplicantJobs(limit = 4): Promise<ApplicantJob[]> {
  return featuredSharedJobs(limit).map(build);
}

export const DEPARTMENTS: Department[] = ["Front of house", "Kitchen", "Bar", "Management", "Admin & operations", "Support"];
export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Casual"] as const;
export const SHIFTS: Shift[] = ["Day", "Evening", "Night", "Rotating"];
