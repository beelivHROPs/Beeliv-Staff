/**
 * ONE place for the job date rules (project lead, locked 2026-10-13/18). Pure functions, usable from
 * server and client components. Calendar days in Africa/Lagos, taken from the machine clock.
 *
 *  - open          : accepting applications, more than CLOSING_SOON_DAYS before the close date
 *  - closing-soon  : accepting applications, 0..CLOSING_SOON_DAYS days before the close date (inclusive)
 *  - closed        : the close date has passed; still viewable for CLOSED_VIEW_DAYS days, then gone
 *  - filled        : the position was filled (treated like closed for the 5-day window)
 *
 * Production: the backend computes this server-side with the same two server values (see
 * docs/contracts/public-jobs-frontend-plan.md section 0); the UI never decides it on its own.
 */

export const CLOSING_SOON_DAYS = 5;
export const CLOSED_VIEW_DAYS = 5;

export type JobState = "open" | "closing-soon" | "closed" | "filled";

export interface JobAvailability {
  state: JobState;
  /** Whole days until the close date (0 = closes today); null when there is no close date. Negative once ended. */
  daysToClose: number | null;
  /** Whole days since the job ended (1 = ended yesterday); 0 while it is still open. */
  daysSinceEnd: number;
  /** True while applications are accepted. */
  accepting: boolean;
  /** True on the public site / in the app: open, closing soon, or ended within the viewing window. */
  visible: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's calendar date in Africa/Lagos as YYYY-MM-DD (machine clock). */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const toUtc = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Whole calendar days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** YYYY-MM-DD shifted by `days` (negative = earlier). */
export function addDays(iso: string, days: number): string {
  const d = new Date(toUtc(iso) + days * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** The status of a job from its close date (inclusive: it still accepts applications on that day). */
export function jobAvailability(job: { closesOn: string | null; filled?: boolean }, today: string = todayIso()): JobAvailability {
  const daysToClose = job.closesOn ? daysBetween(today, job.closesOn) : null;
  const ended = daysToClose !== null && (daysToClose < 0 || (job.filled === true && daysToClose <= 0));
  if (!ended) {
    const soon = daysToClose !== null && daysToClose <= CLOSING_SOON_DAYS;
    return { state: soon ? "closing-soon" : "open", daysToClose, daysSinceEnd: 0, accepting: true, visible: true };
  }
  const daysSinceEnd = Math.max(1, -(daysToClose as number));
  return { state: job.filled ? "filled" : "closed", daysToClose, daysSinceEnd, accepting: false, visible: daysSinceEnd <= CLOSED_VIEW_DAYS };
}

/* ------------------------------------------------------------ labels */

export function postedLabel(days: number): string {
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 7) return `Posted ${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `Posted ${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
};

/** The card line: "Closes 23 Oct 2026", "Closed 2 days ago", "Position filled 3 days ago". */
export function closesLabel(a: JobAvailability, closesOn: string | null): string {
  if (a.state === "closed" || a.state === "filled") {
    const when = a.daysSinceEnd === 1 ? "yesterday" : `${a.daysSinceEnd} days ago`;
    return `${a.state === "filled" ? "Position filled" : "Closed"} ${when}`;
  }
  return closesOn ? `Closes ${shortDate(closesOn)}` : "Open until filled";
}

/** Public chip text for a state. */
export const STATE_CHIP: Record<JobState, string> = { open: "Open", "closing-soon": "Closing soon", closed: "Closed", filled: "Position filled" };
