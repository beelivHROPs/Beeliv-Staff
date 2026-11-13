/**
 * Public-site job data layer (Home featured, /jobs, search, signup/login intent).
 *
 * FRONTEND-ONLY SAMPLE DATA. Every job comes from the ONE shared list in lib/jobs/shared.ts (the same list
 * the Applicant app and the Admin vacancy mock use); dates and states are worked out in lib/jobs/status.ts.
 * Nothing here has its own copy of a job. To wire real data later, replace these functions with a read of
 * the single public jobs projection (posted/close dates, availability computed server-side).
 *
 * Which jobs are public: open, closing soon, or ended within the last 5 days (closed jobs show "Closed" and
 * have no Apply). Older ones are gone (the job page returns a real 404). Featured = the newest open jobs.
 */
import { allSharedJobs, featuredSharedJobs, findSharedJob, visibleSharedJobs, type SharedJob } from "@/lib/jobs/shared";
import { postedLabel, type JobState } from "@/lib/jobs/status";
import type { JobCardData } from "@/lib/jobs/card";

export type Department =
  | "Front of house"
  | "Kitchen"
  | "Bar"
  | "Management"
  | "Admin & operations"
  | "Support";

export type Job = {
  id: string;
  role: string;
  company: string;
  location: string;
  employmentType: string;
  department: string;
  /** "Posted X ago" line on every job card. */
  postedLabel: string;
  /** Whole days since posted - drives the /jobs "Date posted" filter. */
  postedDaysAgo: number;
  /** Public job page (readable name slug). */
  href: string;
  image: { src: string; alt: string } | null;
  /** open / closing-soon / closed / filled, computed from the close date. */
  state: JobState;
  closesOn: string | null;
};

export const toPublicJob = (j: SharedJob): Job => ({
  id: j.id,
  role: j.role,
  company: j.company,
  location: j.location,
  employmentType: j.employmentType,
  department: j.department,
  postedLabel: postedLabel(j.postedDaysAgo),
  postedDaysAgo: j.postedDaysAgo,
  href: `/jobs/${j.id}`,
  image: j.image,
  state: j.availability.state,
  closesOn: j.closesOn,
});

/** Home "featured": the newest open jobs (newest posted first). */
export async function getFeaturedJobs(limit = 4): Promise<Job[]> {
  return featuredSharedJobs(limit).map(toPublicJob);
}

/** Every job a visitor may see (open, closing soon, or closed within 5 days), newest first. */
export async function getPublicJobs(): Promise<Job[]> {
  return visibleSharedJobs().map(toPublicJob);
}

/** Intent lookup for signup/login: any PUBLIC job by id or name slug; null when unknown or no longer public. */
export async function getPublicJobForIntent(idOrSlug: string): Promise<{ job: Job; accepting: boolean } | null> {
  const j = findSharedJob(idOrSlug);
  if (!j || !j.availability.visible) return null;
  return { job: toPublicJob(j), accepting: j.availability.accepting };
}

/** Every job id in the sample list that is currently public (for the public job page's static params). */
export function publicJobIds(): string[] {
  return visibleSharedJobs().map((j) => j.id);
}

/** All sample ids, public or not (the Applicant app tells "no longer available" apart from "unknown"). */
export const knownJobIds = (): string[] => allSharedJobs().map((j) => j.id);

/** Static rows for the route's loading skeleton (never shown as real data). */
export const SKELETON_JOBS: JobCardData[] = [
  { id: "sk-1", role: "Head Chef", company: "The Urban Grill", location: "Abuja", employmentType: "Full-time", department: "Kitchen", image: null, pay: null, postedLabel: "Posted 2 days ago", closes: "Closes 30 Oct 2026", openings: 1, state: "open" },
  { id: "sk-2", role: "Restaurant Supervisor", company: "The Honey Suckle", location: "Abuja", employmentType: "Full-time", department: "Management", image: null, pay: null, postedLabel: "Posted 3 days ago", closes: "Closes 30 Oct 2026", openings: 1, state: "open" },
  { id: "sk-3", role: "Bar Supervisor", company: "The Velvet Room", location: "Lagos", employmentType: "Contract", department: "Bar", image: null, pay: null, postedLabel: "Posted 5 days ago", closes: "Closes 30 Oct 2026", openings: 1, state: "open" },
  { id: "sk-4", role: "Guest Relations Officer", company: "The Palm Lounge", location: "Abuja", employmentType: "Full-time", department: "Front of house", image: null, pay: null, postedLabel: "Posted 1 week ago", closes: "Closes 30 Oct 2026", openings: 1, state: "open" },
];
