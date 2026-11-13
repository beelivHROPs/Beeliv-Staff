/**
 * Display helpers for Vacancies (labels, chip tones, date wording). Presentation
 * only: no rules. Statuses, departments and roles all come from the adapter.
 * "Posted ..." / "Closes ..." follow the locked job-card template: both are
 * always shown, and the closing date is required on every vacancy.
 */
import { resolveJobPhoto } from "@/lib/admin/vacancies/jobPhotos";
import type { ApplicantJob } from "@/lib/applicant/jobs";
import { CLOSED_VIEW_DAYS, closesLabel, daysBetween, jobAvailability, postedLabel, shortDate, todayIso, type JobAvailability, type JobState } from "@/lib/jobs/status";
import type { ChipTone } from "@/components/client/StatusChip";
import type { VacancyAction, VacancyDetail, VacancyRow, VacancyStatus, VacancyTab } from "@/lib/admin/vacancies/types";

export const STATUS_LABEL: Record<VacancyStatus, string> = {
  draft: "Draft",
  "pending-approval": "Pending Approval",
  published: "Published",
  paused: "Paused",
  "closing-soon": "Closing Soon",
  closed: "Closed",
  filled: "Filled",
  cancelled: "Cancelled",
};

/** Pending = yellow; Published = green; the rest are neutral/blue. Red is reserved for needs-attention. */
export const STATUS_TONE: Record<VacancyStatus, ChipTone> = {
  draft: "mute",
  "pending-approval": "warn",
  published: "ok",
  paused: "info",
  "closing-soon": "warn",
  closed: "mute",
  filled: "mute",
  cancelled: "mute",
};

export const STATUS_ORDER: VacancyStatus[] = ["draft", "pending-approval", "published", "closing-soon", "paused", "closed", "filled", "cancelled"];

export const TAB_LABEL: Record<VacancyTab, string> = { all: "All", open: "Open", draft: "Drafts", pending: "Pending approval", paused: "Paused", ended: "Closed or filled" };
export const TAB_ORDER: VacancyTab[] = ["all", "open", "draft", "pending", "paused", "ended"];

export const ACTION_LABEL: Record<VacancyAction, string> = {
  "submit-for-approval": "Submit for approval",
  publish: "Publish",
  resume: "Resume",
  pause: "Pause",
  close: "Close",
  "mark-filled": "Mark as filled",
  cancel: "Cancel vacancy",
};

export const ACTION_NEEDS_REASON: VacancyAction[] = ["pause", "close", "mark-filled", "cancel"];

const parse = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function formatYmd(ymd: string): string {
  if (!ymd) return "";
  return parse(ymd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).replace("Sept", "Sep");
}

export function formatIsoDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).replace("Sept", "Sep");
}

export function postedText(r: Pick<VacancyRow, "postedAt">): string {
  if (!r.postedAt) return "Not posted yet";
  return postedLabel(Math.max(0, daysBetween(todayIso(new Date(r.postedAt)), todayIso())));
}

/**
 * The card's state and "Closes ..." line from the SAME rules the applicant sees (lib/jobs/status.ts):
 * closing soon is computed from the close date; a closed or filled vacancy reads "Closed 2 days ago".
 * A vacancy that is not live yet (draft, pending, paused, cancelled) previews as open with its close date.
 */
function cardDates(d: Pick<VacancyDetail, "status" | "closesOn" | "endedAt">): { state: JobState; closes: string } {
  const today = todayIso();
  if (d.status === "closed" || d.status === "filled") {
    const since = Math.max(1, daysBetween(d.endedAt ? todayIso(new Date(d.endedAt)) : d.closesOn, today));
    const a: JobAvailability = { state: d.status, daysToClose: -since, daysSinceEnd: since, accepting: false, visible: since <= CLOSED_VIEW_DAYS };
    return { state: d.status, closes: closesLabel(a, d.closesOn) };
  }
  if (!d.closesOn) return { state: "open", closes: "Closing date not set" };
  if (d.status === "published" || d.status === "closing-soon") {
    const a = jobAvailability({ closesOn: d.closesOn }, today);
    return { state: a.state, closes: closesLabel(a, d.closesOn) };
  }
  return { state: "open", closes: `Closes ${shortDate(d.closesOn)}` };
}

export function closesText(r: Pick<VacancyRow, "status" | "closesOn" | "endedAt">): string {
  if (r.status === "filled") return "Position filled";
  if (r.status === "closed") return `Closed ${r.endedAt ? formatIsoDate(r.endedAt) : formatYmd(r.closesOn)}`;
  if (r.status === "cancelled") return `Cancelled ${r.endedAt ? formatIsoDate(r.endedAt) : ""}`.trim();
  return `Closes ${formatYmd(r.closesOn)}`;
}

export const COMPETITIVE_PAY = "Competitive, based on experience";

const PER = { Monthly: "month", Weekly: "week", Daily: "day" } as const;
const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/** What applicants see for pay: internal-only salary always reads as the competitive line. */
export function publicSalaryText(s: VacancyDetail["salary"]): string {
  if (s.visibility === "internal" || (s.min === null && s.max === null)) return COMPETITIVE_PAY;
  const range = s.min !== null && s.max !== null ? `${naira(s.min)} - ${naira(s.max)}` : naira((s.min ?? s.max) as number);
  return `${range} / ${PER[s.frequency]}${s.negotiable ? " (negotiable)" : ""}`;
}

/** Internal view of the salary figure (HR only). */
export function internalSalaryText(s: VacancyDetail["salary"]): string {
  if (s.min === null && s.max === null) return "Not set";
  const range = s.min !== null && s.max !== null ? `${naira(s.min)} - ${naira(s.max)}` : naira((s.min ?? s.max) as number);
  return `${range} / ${PER[s.frequency]}${s.negotiable ? " (negotiable)" : ""}`;
}

/** The card photo: the vacancy's own choice, else its department default; null = branded neutral cover. */
function photoOf(d: Pick<VacancyDetail, "image" | "department" | "title">): ApplicantJob["image"] {
  const p = resolveJobPhoto(d.image, d.department, `Photo for ${d.title || "this job"}`);
  return p.src ? { src: p.src, alt: p.alt } : null;
}

/** Maps a vacancy to the Applicant app's job shape so the SAME JobCard can render the preview. */
export function toApplicantJob(d: VacancyDetail): ApplicantJob {
  const salary = d.salary.visibility === "internal" ? { min: null, max: null, frequency: d.salary.frequency } : { min: d.salary.min, max: d.salary.max, frequency: d.salary.frequency, negotiable: d.salary.negotiable };
  const closed = d.status === "closed" || d.status === "filled";
  const pay = salary.min !== null && salary.max !== null ? `${naira(salary.min)} - ${naira(salary.max)} / ${PER[d.salary.frequency]}` : null;
  return {
    id: d.id,
    role: d.title,
    company: d.outlet ? `${d.client.name}, ${d.outlet.name}` : d.client.name,
    location: d.location,
    employmentType: d.employmentType,
    department: d.department,
    postedLabel: postedText(d),
    href: "",
    image: photoOf(d),
    jobRef: d.reference,
    openings: d.openings,
    deadline: d.closesOn,
    expectedResumption: d.expectedResumption,
    status: d.status === "closing-soon" ? "Closing soon" : d.status === "closed" ? "Closed" : d.status === "filled" ? "Filled" : "Published",
    about: d.about,
    responsibilities: d.responsibilities,
    essential: d.essential,
    preferred: d.preferred,
    experience: { minYears: d.experience.minYears, maxYears: d.experience.maxYears, summary: d.experience.summary, flags: [] },
    skills: d.skills,
    salary,
    benefits: d.benefits.filter((b) => b.visibility === "public").map((b) => ({ kind: b.kind, detail: b.detail })),
    conditions: { ...d.conditions, resumptionTime: "", closingTime: "" },
    interviewMethod: d.interview.method,
    requiredDocuments: d.requiredDocuments,
    shift: "Rotating",
    pay,
    daysAgo: d.postedAt ? Math.max(0, daysBetween(todayIso(new Date(d.postedAt)), todayIso())) : 0,
    closes: cardDates(d).closes,
    state: cardDates(d).state,
    match: null,
    closed,
  } as unknown as ApplicantJob;
}
