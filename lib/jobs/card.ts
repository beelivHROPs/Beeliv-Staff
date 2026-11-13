/**
 * The data ONE job card needs. The same card is used on the public site (list, Home featured, related roles)
 * and in the Applicant app; the Applicant job type and the loading skeleton both satisfy this shape.
 * Per-person state (applied, draft, saved, match) is NOT part of it: signed-out visitors never see it.
 */
import type { JobState } from "./status";

export interface JobCardData {
  id: string;
  role: string;
  company: string;
  location: string;
  employmentType: string;
  department: string;
  image: { src: string; alt: string } | null;
  /** Short public pay line, or null when pay is not published. */
  pay: string | null;
  /** "Posted 2 days ago". */
  postedLabel: string;
  /** "Closes 30 Oct 2026" / "Closed 2 days ago". */
  closes: string;
  openings: number;
  state: JobState;
  shift?: string;
  match?: "Strong match" | "Good match" | null;
}

/**
 * The state to show on a card. Normally `job.state`; the Admin vacancy preview builds its job object from a
 * vacancy's own status (already computed with the same rules), so fall back to the older `status`/`closed` fields.
 */
export function cardState(job: JobCardData & { closed?: boolean; status?: string }): JobState {
  if (job.state) return job.state;
  if (job.status === "Filled") return "filled";
  if (job.closed || job.status === "Closed") return "closed";
  return job.status === "Closing soon" ? "closing-soon" : "open";
}
