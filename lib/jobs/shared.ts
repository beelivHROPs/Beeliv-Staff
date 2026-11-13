/**
 * THE one sample job list (FRONTEND MOCK). The public site (/jobs, Home featured, search, job pages),
 * the Applicant app, signup/login job intent and the Admin vacancy mock all read from here, so a job has
 * exactly one posted date, one close date and one state everywhere.
 *
 * Dates are stored as offsets from TODAY (machine clock, Africa/Lagos) so the demo always shows every
 * state: open, closing soon, closed 2 days ago (still viewable), and ended 8-10 days ago (gone: public
 * page 404, app shows "no longer available"). The state itself comes from ./status.ts, never from a
 * hand-set label. Production: the backend returns postedAt/closesOn per job and computes the same rules.
 *
 * Per-job detail copy (about, salary, requirements...) is in lib/public-site/job-details.ts, keyed by id.
 * Job ids are the readable name slugs used in URLs (/jobs/sous-chef).
 *
 * This module imports no UI and no other job module at runtime (types only), so any layer may use it.
 */
import { defaultPhotoFor } from "@/lib/admin/vacancies/jobPhotos";
import type { Department } from "@/lib/public-site/jobs";
import { addDays, jobAvailability, todayIso, type JobAvailability } from "./status";

export type Shift = "Day" | "Evening" | "Night" | "Rotating";
export type Match = "Strong match" | "Good match";

export interface SharedJobBase {
  id: string;
  role: string;
  company: string;
  location: string;
  employmentType: string;
  department: Department;
  shift: Shift;
  match: Match | null;
  /** Explicit photo; absent = the department's default photo (same rule as the Admin job photo section). */
  image?: { src: string; alt: string } | null;
  postedDaysAgo: number;
  /** Days from today to the (inclusive) close date; negative = ended that many days ago; null = no deadline. */
  closeInDays: number | null;
  /** The position was filled on the close date. */
  filled?: boolean;
}

export const SHARED_JOB_BASES: SharedJobBase[] = [
  { id: "head-chef", role: "Head Chef", company: "The Urban Grill", location: "Abuja", employmentType: "Full-time", department: "Kitchen", shift: "Rotating", match: null, postedDaysAgo: 1, closeInDays: 25 },
  { id: "sous-chef", role: "Sous Chef", company: "The Urban Grill", location: "Abuja", employmentType: "Full-time", department: "Kitchen", shift: "Rotating", match: "Strong match", postedDaysAgo: 2, closeInDays: 12 },
  { id: "line-cook", role: "Line Cook", company: "Café Lemon", location: "Abuja", employmentType: "Part-time", department: "Kitchen", shift: "Evening", match: null, postedDaysAgo: 3, closeInDays: 9 },
  { id: "restaurant-supervisor", role: "Restaurant Supervisor", company: "The Honey Suckle", location: "Abuja", employmentType: "Full-time", department: "Management", shift: "Rotating", match: "Strong match", postedDaysAgo: 4, closeInDays: 4 },
  { id: "bar-supervisor", role: "Bar Supervisor", company: "The Velvet Room", location: "Lagos", employmentType: "Contract", department: "Bar", shift: "Evening", match: null, postedDaysAgo: 6, closeInDays: 2 },
  { id: "guest-relations-officer", role: "Guest Relations Officer", company: "The Palm Lounge", location: "Abuja", employmentType: "Full-time", department: "Front of house", shift: "Day", match: "Good match", postedDaysAgo: 7, closeInDays: 14 },
  { id: "waiter-waitress", role: "Waiter / Waitress", company: "Brunch Lane", location: "Lagos", employmentType: "Full-time", department: "Front of house", shift: "Day", match: null, postedDaysAgo: 21, closeInDays: -2 },
  { id: "housekeeping-supervisor", role: "Housekeeping Supervisor", company: "Grand Palm Hotel", location: "Lagos", employmentType: "Full-time", department: "Support", shift: "Rotating", match: null, postedDaysAgo: 18, closeInDays: -10, filled: true },
  { id: "admin-operations-officer", role: "Admin & Operations Officer", company: "Maison 23", location: "Lagos", employmentType: "Full-time", department: "Admin & operations", shift: "Day", match: null, image: { src: "/images/home/office-fallback.jpg", alt: "Operations officer at a laptop" }, postedDaysAgo: 24, closeInDays: -8 },
];

export interface SharedJob extends SharedJobBase {
  image: { src: string; alt: string } | null;
  /** YYYY-MM-DD. */
  postedOn: string;
  closesOn: string | null;
  availability: JobAvailability;
}

function resolveImage(b: SharedJobBase): SharedJob["image"] {
  if (b.image !== undefined) return b.image;
  const { entry, src } = defaultPhotoFor(b.department);
  return src ? { src, alt: entry?.describe ?? `Photo for ${b.role}` } : null;
}

/** Every sample job (including ones that are no longer public), with dates and state worked out for `today`. */
export function allSharedJobs(today: string = todayIso()): SharedJob[] {
  return SHARED_JOB_BASES.map((b) => {
    const closesOn = b.closeInDays === null ? null : addDays(today, b.closeInDays);
    return { ...b, image: resolveImage(b), postedOn: addDays(today, -b.postedDaysAgo), closesOn, availability: jobAvailability({ closesOn, filled: b.filled }, today) };
  });
}

/** Jobs a visitor or applicant may see: open, closing soon, or ended within the 5-day viewing window. Newest posted first. */
export function visibleSharedJobs(today: string = todayIso()): SharedJob[] {
  return allSharedJobs(today)
    .filter((j) => j.availability.visible)
    .sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
}

/** Featured = the newest N jobs that are still accepting applications (decided 2026-10-13: no pinning). */
export function featuredSharedJobs(limit: number, today: string = todayIso()): SharedJob[] {
  return visibleSharedJobs(today)
    .filter((j) => j.availability.accepting)
    .slice(0, limit);
}

/** One job by id/slug, whatever its state (callers decide what to do with a job that is no longer visible). */
export function findSharedJob(idOrSlug: string, today: string = todayIso()): SharedJob | null {
  const key = decodeURIComponent(idOrSlug).trim().toLowerCase();
  return allSharedJobs(today).find((j) => j.id === key) ?? null;
}

/** Close date + filled flag for a job id (used by job-details to derive the listing status). */
export function scheduleFor(id: string, today: string = todayIso()): { closesOn: string | null; filled: boolean; availability: JobAvailability } | null {
  const b = SHARED_JOB_BASES.find((j) => j.id === id);
  if (!b) return null;
  const closesOn = b.closeInDays === null ? null : addDays(today, b.closeInDays);
  return { closesOn, filled: Boolean(b.filled), availability: jobAvailability({ closesOn, filled: b.filled }, today) };
}
