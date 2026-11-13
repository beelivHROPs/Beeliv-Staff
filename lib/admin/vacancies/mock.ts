/**
 * DEV FIXTURE for Vacancies. Everything is FICTIONAL ("Demo" clients, "Sample"
 * people). In memory only: a reload resets it. Replace with a Supabase adapter
 * implementing VacancyAdapter; no screen changes.
 *
 * Rules that live HERE (they are backend rules in production, not UI rules):
 *  - effective status: Published becomes "Closing soon" inside 5 days of the deadline and "Closed"
 *    after it (spec: Closed is set by HR or by the deadline). The rule is lib/jobs/status.ts, the
 *    same one the public site and the Applicant app use; rows whose title is in the shared sample job
 *    list (lib/jobs/shared.ts) take that job's posted and close dates, so all three agree;
 *  - capability flags per HR level (only canPublish differs; the rest needs
 *    Beeliv confirmation);
 *  - which actions are allowed per status;
 *  - every write appends an Activity entry (who / when / action / previous -> new).
 * "Who approves a Pending Approval vacancy" needs Beeliv confirmation: here any
 * user with canPublish can publish it.
 */
import { getAdminIdentity } from "../ops/identity";
import { canDo } from "../role-access";
import { isoOffset } from "@/lib/applicant/time";
import { addDays, daysBetween, jobAvailability, todayIso } from "@/lib/jobs/status";
import { SHARED_JOB_BASES } from "@/lib/jobs/shared";
import { RECRUITMENT_PROCESS, DEFAULT_REQUIRED_DOCUMENTS } from "@/lib/public-site/job-details";
import { sampleJourneyFor } from "@/lib/journeys/samples";
import { applicantTimeline, hasStep, interviewSteps, JOURNEY_METHOD_LABEL, validateJourney, type Journey } from "@/lib/journeys/types";
import { cmpIso, cmpText } from "../sort";
import type { AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { docLabel, getDepartments, getRequiredDocuments } from "../lists/store";
import { clientIdInScope } from "../scope";
import type { VacancyAdapter } from "./adapter";
import {
  VacancyValidationError,
  type ActionInput,
  type FieldErrors,
  type SaveIntent,
  type VacanciesPage,
  type VacancyAction,
  type VacancyActivity,
  type VacancyCapabilities,
  type VacancyConfig,
  type VacancyDetail,
  type VacancyInput,
  type VacancyRow,
  type VacancyStatus,
  type VacancyTab,
} from "./types";

const ACTOR = "Funke Sample";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
const emit = () => listeners.forEach((l) => l("reset"));
subscribePrototypeMode(emit);

/**
 * The HR level follows the prototype identity (lib/admin/ops/identity.ts): HR officer prepares and
 * submits, HR Manager and Operations publish. There is no second in-page switch. The real rule is
 * enforced by the server grant, not here.
 */
const mayPublish = () => getAdminIdentity() !== "hr-officer" && getAdminIdentity() !== "hr-officer-none";

function capabilities(): VacancyCapabilities {
  return {
    // The assigned HR officer views vacancies but does not create or manage them (proposal, needs Beeliv confirmation; lib/admin/role-access.ts).
    canCreate: canDo("vacancy.create"),
    canEdit: canDo("vacancy.manage"),
    // Operations publishes directly and never "submits for approval" (project lead 2026-10-17).
    canPublish: mayPublish() && canDo("vacancy.manage"),
    canSubmitForApproval: canDo("vacancy.manage"),
    canPause: canDo("vacancy.manage"),
    canClose: canDo("vacancy.manage"),
    canMarkFilled: canDo("vacancy.manage"),
    canCancel: canDo("vacancy.manage"),
  };
}

/* ---------- configurable data ---------- */

const CONFIG_BASE = {
  // Departments keep the current names (decided 2026-09-29); admins will configure them later.
  departments: ["Front of house", "Kitchen", "Bar", "Management", "Admin & operations", "Support"],
  employmentTypes: ["Full-time", "Part-time", "Contract", "Casual"],
  benefitKinds: ["Feeding", "Transport", "Accommodation", "Medical", "Leave", "Service charge", "Staff welfare", "Other"],
  clients: [
    { id: "c-demo-hotel", name: "Demo Hotel Abuja", outlets: [{ id: "o-demo-hotel-main", name: "Main building" }] },
    { id: "c-demo-lounge", name: "Demo Lounge Lagos", outlets: [{ id: "o-demo-lounge-vi", name: "Victoria Island" }] },
    { id: "c-demo-grill", name: "Demo Grill Port Harcourt", outlets: [{ id: "o-demo-grill-main", name: "Town centre" }] },
  ],
  recruiters: [
    { id: "r-funke", name: "Funke Sample" },
    { id: "r-tunde", name: "Tunde Sample" },
    { id: "r-amina", name: "Amina Sample" },
  ],
  defaultRecruitmentProcess: [...RECRUITMENT_PROCESS],
  defaultRequiredDocuments: { atApplication: [...DEFAULT_REQUIRED_DOCUMENTS.atApplication], afterSelection: [...DEFAULT_REQUIRED_DOCUMENTS.afterSelection] },
};

const clientName = (id: string) => CONFIG_BASE.clients.find((c) => c.id === id)?.name ?? "Unknown client";
const outletName = (cid: string, oid: string) => CONFIG_BASE.clients.find((c) => c.id === cid)?.outlets.find((o) => o.id === oid)?.name ?? null;
const recruiterName = (id: string) => CONFIG_BASE.recruiters.find((r) => r.id === id)?.name ?? null;

/* ---------- store ---------- */

type StoredStatus = Exclude<VacancyStatus, "closing-soon">;
interface Stored {
  id: string;
  reference: string;
  input: VacancyInput;
  status: StoredStatus;
  postedAt: string | null;
  endedAt: string | null;
  counts: NonNullable<VacancyDetail["counts"]>;
  activity: VacancyActivity[];
}

const ymd = (daysFromNow: number) => addDays(todayIso(), daysFromNow);
const daysUntil = (date: string) => daysBetween(todayIso(), date);

function content(title: string, dept: string): Omit<VacancyInput, "title" | "department" | "clientId" | "outletId" | "location" | "employmentType" | "openings" | "recruiterId" | "closesOn"> {
  // Each sample job gets its own journey (lib/journeys/samples.ts); documents, questions and the test follow its steps.
  const journey = sampleJourneyFor(title, dept);
  const firstInterview = interviewSteps(journey)[0]?.interview;
  return {
    expectedResumption: ymd(35),
    about: `Sample copy. The ${title} joins the ${dept} team and helps the outlet deliver a consistent guest experience.`,
    responsibilities: ["Deliver service to the outlet's standards.", "Follow opening and closing procedures.", "Support the team during peak periods."],
    essential: ["Secondary school certificate or relevant qualification.", "Good communication skills.", "Ability to work shifts, weekends and public holidays."],
    preferred: ["Previous hospitality experience.", "Relevant certification."],
    experience: { minYears: 1, maxYears: 3, summary: "1-3 years in a similar role." },
    skills: ["Customer care", "Teamwork", "Time management"],
    salary: { min: 150_000, max: 220_000, frequency: "Monthly", negotiable: false, visibility: "public" },
    benefits: [
      { id: "b1", kind: "Feeding", detail: "Staff meal on every shift", visibility: "public" },
      { id: "b2", kind: "Leave", detail: "Annual leave after probation", visibility: "public" },
    ],
    conditions: { workingDays: "6 days a week, 1 rotating day off", shiftSystem: "Rotating shifts", hours: "About 9 hours per shift", weekends: "Required", publicHolidays: "Required" },
    requiredDocuments: {
      atApplication: hasStep(journey, "documents-at-application") ? [...DEFAULT_REQUIRED_DOCUMENTS.atApplication] : [],
      afterSelection: hasStep(journey, "documents-after-selection") ? [...DEFAULT_REQUIRED_DOCUMENTS.afterSelection] : [],
    },
    screeningQuestions: hasStep(journey, "screening-questions")
      ? [
          { id: "q1", text: "Do you have experience in a similar role?", required: true, answerType: "yes-no" },
          { id: "q2", text: "Can you work weekends and public holidays?", required: true, answerType: "yes-no" },
          { id: "q3", text: "Tell us briefly why you want this role.", required: false, answerType: "text" },
        ]
      : [],
    testFormId: hasStep(journey, "test-or-form") ? "form-training-test" : undefined,
    journey,
    recruitmentProcess: applicantTimeline(journey),
    interview: firstInterview ? { method: JOURNEY_METHOD_LABEL[firstInterview.defaultMethod], location: firstInterview.defaultMethod === "in-person" ? "Outlet, with the HR recruiter" : "" } : { method: "", location: "" },
  };
}

/** title, dept, client, outlet, location, type, openings, recruiter, status, posted days ago, closes in days, [apps, shortlisted, interviewed, placed] */
type Seed = [string, string, string, string, string, string, number, string, StoredStatus, number | null, number, [number, number, number, number]];
/** [posted days ago, closes in days] of a job in the shared sample list (lib/jobs/shared.ts). */
const S = (role: string): [number, number] => {
  const j = SHARED_JOB_BASES.find((b) => b.role === role);
  if (!j || j.closeInDays === null) throw new Error(`Shared sample job not found: ${role}`);
  return [j.postedDaysAgo, j.closeInDays];
};
const SEED: Seed[] = [
  ["Waiter / Waitress", "Front of house", "c-demo-hotel", "o-demo-hotel-main", "Abuja", "Full-time", 3, "r-funke", "published", ...S("Waiter / Waitress"), [34, 9, 5, 1]],
  ["Commis Chef", "Kitchen", "c-demo-lounge", "o-demo-lounge-vi", "Lagos", "Full-time", 2, "r-tunde", "published", 12, 4, [21, 6, 4, 0]],
  ["Bar Attendant", "Bar", "c-demo-lounge", "o-demo-lounge-vi", "Lagos", "Part-time", 2, "r-tunde", "published", 3, 25, [12, 3, 1, 0]],
  ["Front Desk Officer", "Front of house", "c-demo-hotel", "o-demo-hotel-main", "Abuja", "Full-time", 1, "r-amina", "pending-approval", null, 30, [0, 0, 0, 0]],
  ["Floor Supervisor", "Management", "c-demo-hotel", "o-demo-hotel-main", "Abuja", "Full-time", 1, "r-funke", "draft", null, 21, [0, 0, 0, 0]],
  ["Kitchen Porter", "Kitchen", "c-demo-grill", "o-demo-grill-main", "Port Harcourt", "Contract", 4, "r-amina", "paused", 20, 14, [18, 5, 2, 0]],
  ["Housekeeping Supervisor", "Support", "c-demo-hotel", "o-demo-hotel-main", "Abuja", "Full-time", 1, "r-funke", "filled", ...S("Housekeeping Supervisor"), [27, 8, 6, 1]],
  ["Barista", "Bar", "c-demo-grill", "o-demo-grill-main", "Port Harcourt", "Casual", 2, "r-amina", "closed", 35, -5, [15, 2, 2, 0]],
  ["Events Coordinator", "Admin & operations", "c-demo-lounge", "o-demo-lounge-vi", "Lagos", "Full-time", 1, "r-tunde", "cancelled", 25, 10, [4, 0, 0, 0]],
  ["Host / Hostess", "Front of house", "c-demo-lounge", "o-demo-lounge-vi", "Lagos", "Full-time", 2, "", "draft", null, 28, [0, 0, 0, 0]],
  ["Pastry Chef", "Kitchen", "c-demo-hotel", "o-demo-hotel-main", "Abuja", "Full-time", 1, "r-tunde", "published", 9, 2, [16, 4, 3, 0]],
  ["Security Steward", "Support", "c-demo-grill", "o-demo-grill-main", "Port Harcourt", "Contract", 2, "r-funke", "pending-approval", null, 20, [0, 0, 0, 0]],
  ["Line Cook", "Kitchen", "c-demo-grill", "o-demo-grill-main", "Port Harcourt", "Part-time", 2, "r-amina", "published", ...S("Line Cook"), [11, 3, 1, 0]],
  ["Admin & Operations Officer", "Admin & operations", "c-demo-lounge", "o-demo-lounge-vi", "Lagos", "Full-time", 1, "r-tunde", "published", ...S("Admin & Operations Officer"), [19, 5, 4, 0]],
];

let counter = 0;
const nextId = () => `v-${++counter}`;
const nextRef = () => `BLV-VAC-${String(900000 + counter).padStart(6, "0")}`;

function seedStore(): Stored[] {
  counter = 0;
  return SEED.map(([title, dept, cid, oid, location, type, openings, rec, status, posted, closesIn, c]) => {
    const id = nextId();
    const input: VacancyInput = { title, department: dept, clientId: cid, outletId: oid, location, employmentType: type, openings, recruiterId: rec, closesOn: ymd(closesIn), ...content(title, dept) };
    if (title === "Bar Attendant") input.salary = { min: 180_000, max: 240_000, frequency: "Monthly", negotiable: false, visibility: "internal" };
    const activity: VacancyActivity[] = [{ id: `${id}-a1`, at: isoOffset(-(posted ?? 2) - 2, 10, 0), actor: ACTOR, action: "Created the vacancy", from: null, to: "Draft" }];
    if (status !== "draft") activity.push({ id: `${id}-a2`, at: isoOffset(-(posted ?? 1), 9, 30), actor: ACTOR, action: status === "pending-approval" ? "Submitted for approval" : "Published the vacancy", from: "Draft", to: status === "pending-approval" ? "Pending Approval" : "Published" });
    if (status === "paused") activity.push({ id: `${id}-a3`, at: isoOffset(-2, 15, 0), actor: "Tunde Sample", action: "Paused the vacancy", from: "Published", to: "Paused", reason: "Client asked to hold while the budget is confirmed." });
    if (status === "filled") activity.push({ id: `${id}-a3`, at: isoOffset(-10, 15, 0), actor: ACTOR, action: "Marked the position as filled", from: "Published", to: "Filled", reason: "Offer accepted and the candidate was placed." });
    if (status === "closed") activity.push({ id: `${id}-a3`, at: isoOffset(-5, 23, 59), actor: "System", action: "Closed at the deadline", from: "Published", to: "Closed" });
    if (status === "cancelled") activity.push({ id: `${id}-a3`, at: isoOffset(-6, 11, 0), actor: ACTOR, action: "Cancelled the vacancy", from: "Published", to: "Cancelled", reason: "The client withdrew the role." });
    const ended = status === "filled" || status === "closed" || status === "cancelled";
    return {
      id,
      reference: nextRef(),
      input,
      status,
      postedAt: posted === null ? null : isoOffset(-posted, 9, 30),
      endedAt: ended ? activity[activity.length - 1].at : null,
      counts: { applications: c[0], shortlisted: c[1], interviewed: c[2], placed: c[3] },
      activity: activity.reverse(),
    };
  }).reverse();
}

let store: Stored[] = seedStore();

/* ---------- derivations ---------- */

function effectiveStatus(s: Stored): VacancyStatus {
  if (s.status !== "published") return s.status;
  const a = jobAvailability({ closesOn: s.input.closesOn });
  if (a.state === "closed") return "closed";
  return a.state === "closing-soon" ? "closing-soon" : "published";
}

const STATUS_LABEL: Record<VacancyStatus, string> = {
  draft: "Draft",
  "pending-approval": "Pending Approval",
  published: "Published",
  paused: "Paused",
  "closing-soon": "Closing Soon",
  closed: "Closed",
  filled: "Filled",
  cancelled: "Cancelled",
};

function allowed(status: VacancyStatus, c: VacancyCapabilities): VacancyAction[] {
  const out: VacancyAction[] = [];
  const open = status === "published" || status === "closing-soon";
  if (status === "draft" && c.canSubmitForApproval && !c.canPublish) out.push("submit-for-approval");
  if ((status === "draft" || status === "pending-approval") && c.canPublish) out.push("publish");
  if (status === "paused" && c.canPublish) out.push("resume");
  if ((open || status === "paused") && c.canPause && open) out.push("pause");
  if ((open || status === "paused") && c.canClose) out.push("close");
  if ((open || status === "paused") && c.canMarkFilled) out.push("mark-filled");
  if ((status === "draft" || status === "pending-approval" || status === "paused") && c.canCancel) out.push("cancel");
  return out;
}

function toRow(s: Stored): VacancyRow {
  const i = s.input;
  return {
    id: s.id,
    reference: s.reference,
    title: i.title,
    department: i.department,
    client: { id: i.clientId, name: clientName(i.clientId) },
    outlet: i.outletId ? { id: i.outletId, name: outletName(i.clientId, i.outletId) ?? "" } : null,
    location: i.location,
    employmentType: i.employmentType,
    recruiter: i.recruiterId ? { id: i.recruiterId, name: recruiterName(i.recruiterId) ?? "" } : null,
    openings: i.openings,
    counts: s.counts,
    status: effectiveStatus(s),
    postedAt: s.postedAt,
    closesOn: i.closesOn,
    endedAt: s.endedAt,
  };
}

function toDetail(s: Stored): VacancyDetail {
  const { title, department, clientId, outletId, location, employmentType, openings, recruiterId, closesOn, ...rest } = s.input;
  const unused = [title, department, clientId, outletId, location, employmentType, openings, recruiterId, closesOn];
  void unused.length;
  return { ...toRow(s), ...structuredClone(rest), allowedActions: allowed(effectiveStatus(s), capabilities()), canEdit: capabilities().canEdit && !TAB_MATCH.ended(effectiveStatus(s)), activity: structuredClone(s.activity) };
}

/* ---------- validation ---------- */

function validate(i: VacancyInput, mustBeFuture: boolean): FieldErrors {
  const e: FieldErrors = {};
  if (!i.title.trim()) e.title = "Enter the job title.";
  if (!i.department) e.department = "Choose a department.";
  if (!i.clientId) e.clientId = "Choose the client.";
  if (!i.outletId) e.outletId = "Choose the outlet.";
  if (!i.location.trim()) e.location = "Enter the job location.";
  if (!i.employmentType) e.employmentType = "Choose the employment type.";
  if (!Number.isInteger(i.openings) || i.openings < 1) e.openings = "Openings must be at least 1.";
  if (!i.closesOn) e.closesOn = "A closing date is required on every vacancy.";
  else if (mustBeFuture && daysUntil(i.closesOn) < 0) e.closesOn = "The closing date cannot be in the past.";
  Object.assign(e, validateJourney(i.journey));
  if (i.image && !i.image.alt.trim()) e.photoAlt = "Describe the photo in a few words, for people who cannot see it.";
  return e;
}

const fmtDate = (ymdStr: string) => new Date(`${ymdStr}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).replace("Sept", "Sep");

function diffActivity(prev: VacancyInput, next: VacancyInput, id: string): VacancyActivity[] {
  const at = new Date().toISOString();
  const out: VacancyActivity[] = [];
  const add = (action: string, from: string, to: string) => out.push({ id: `${id}-${at}-${out.length}`, at, actor: ACTOR, action, from, to });
  if (prev.title !== next.title) add("Changed the title", prev.title, next.title);
  if (prev.department !== next.department) add("Changed the department", prev.department, next.department);
  if (prev.clientId !== next.clientId || prev.outletId !== next.outletId) add("Changed the client / outlet", `${clientName(prev.clientId)}, ${outletName(prev.clientId, prev.outletId) ?? "none"}`, `${clientName(next.clientId)}, ${outletName(next.clientId, next.outletId) ?? "none"}`);
  if (prev.location !== next.location) add("Changed the location", prev.location, next.location);
  if (prev.employmentType !== next.employmentType) add("Changed the employment type", prev.employmentType, next.employmentType);
  if (prev.openings !== next.openings) add("Changed the number of openings", String(prev.openings), String(next.openings));
  if (prev.recruiterId !== next.recruiterId) add("Changed the recruiter", recruiterName(prev.recruiterId) ?? "Unassigned", recruiterName(next.recruiterId) ?? "Unassigned");
  if (prev.closesOn !== next.closesOn) add("Changed the closing date", fmtDate(prev.closesOn), fmtDate(next.closesOn));
  if (prev.salary.visibility !== next.salary.visibility) add("Changed the salary visibility", prev.salary.visibility === "public" ? "Public" : "Internal only", next.salary.visibility === "public" ? "Public" : "Internal only");
  const photoLabel = (i: VacancyInput) => (!i.image || i.image.source === "default" ? "Department default" : i.image.source === "library" ? "Library photo" : "Own upload");
  if (photoLabel(prev) !== photoLabel(next) || (prev.image?.ref ?? "") !== (next.image?.ref ?? "")) add("Changed the job photo", photoLabel(prev), photoLabel(next));
  const strip = (i: VacancyInput) => {
    const { image, journey, recruitmentProcess, title, department, clientId, outletId, location, employmentType, openings, recruiterId, closesOn, ...r } = i;
    const unused = [image, journey, recruitmentProcess, title, department, clientId, outletId, location, employmentType, openings, recruiterId, closesOn];
    void unused.length;
    return JSON.stringify({ ...r, salary: { ...r.salary, visibility: "" } });
  };
  if (JSON.stringify(prev.journey) !== JSON.stringify(next.journey)) out.push({ id: `${id}-${at}-journey`, at, actor: ACTOR, action: "Changed the application journey", from: null, to: null });
  if (strip(prev) !== strip(next)) out.push({ id: `${id}-${at}-content`, at, actor: ACTOR, action: "Updated the job content", from: null, to: null });
  return out;
}

const STATUS_TO: Record<VacancyAction, StoredStatus> = {
  "submit-for-approval": "pending-approval",
  publish: "published",
  resume: "published",
  pause: "paused",
  close: "closed",
  "mark-filled": "filled",
  cancel: "cancelled",
};
const ACTION_TEXT: Record<VacancyAction, string> = {
  "submit-for-approval": "Submitted for approval",
  publish: "Published the vacancy",
  resume: "Resumed the vacancy",
  pause: "Paused the vacancy",
  close: "Closed the vacancy",
  "mark-filled": "Marked the position as filled",
  cancel: "Cancelled the vacancy",
};
const NEEDS_REASON: VacancyAction[] = ["pause", "close", "mark-filled", "cancel"];

function move(s: Stored, action: VacancyAction, reason?: string) {
  const from = STATUS_LABEL[effectiveStatus(s)];
  const to = STATUS_TO[action];
  s.status = to;
  if (to === "published" && !s.postedAt) s.postedAt = new Date().toISOString();
  s.endedAt = to === "closed" || to === "filled" || to === "cancelled" ? new Date().toISOString() : null;
  const at = new Date().toISOString();
  s.activity.unshift({ id: `${s.id}-${at}-${s.activity.length}`, at, actor: ACTOR, action: ACTION_TEXT[action], from, to: STATUS_LABEL[to], reason });
}

async function guard(): Promise<void> {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  await sleep(300);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
}

/* ---------- adapter ---------- */

const TAB_MATCH: Record<VacancyTab, (s: VacancyStatus) => boolean> = {
  all: () => true,
  open: (s) => s === "published" || s === "closing-soon",
  draft: (s) => s === "draft",
  pending: (s) => s === "pending-approval",
  paused: (s) => s === "paused",
  ended: (s) => s === "closed" || s === "filled" || s === "cancelled",
};

/** The journey of the (first) vacancy with this title. Lets the Interviews mock take stage names, defaults and scorecards from the vacancy. */
export function journeyOfVacancyTitle(title: string): Journey | null {
  const s = store.find((x) => x.input.title === title);
  return s ? s.input.journey : null;
}

export const mockVacancyAdapter: VacancyAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async getConfig() {
    await sleep(150);
    // Departments and the default required documents come from Lists & Rules (/admin/lists).
    const docs = (stage: "application" | "after-selection") => getRequiredDocuments().filter((r) => r.roleId === null && r.required && r.stage === stage).map((r) => docLabel(r.docTypeKey));
    return {
      ...structuredClone(CONFIG_BASE),
      clients: structuredClone(CONFIG_BASE.clients.filter((c) => clientIdInScope(c.id))),
      departments: getDepartments().map((x) => x.name),
      defaultRequiredDocuments: { atApplication: docs("application"), afterSelection: docs("after-selection") },
      capabilities: capabilities(),
    } satisfies VacancyConfig;
  },

  async listVacancies(q): Promise<VacanciesPage> {
    await guard();
    const mode = getPrototypeMode();
    const all = mode === "empty" ? [] : store.map(toRow).filter((r) => clientIdInScope(r.client.id));
    const needle = q.search.trim().toLowerCase();
    const base = all.filter((r) => {
      if (needle && ![r.title, r.department, r.client.name, r.outlet?.name ?? "", r.recruiter?.name ?? "", r.location, r.reference].some((t) => t.toLowerCase().includes(needle))) return false;
      if (q.status && r.status !== q.status) return false;
      if (q.department && r.department !== q.department) return false;
      if (q.clientId && r.client.id !== q.clientId) return false;
      if (q.recruiterId === "none" ? r.recruiter !== null : q.recruiterId && r.recruiter?.id !== q.recruiterId) return false;
      return true;
    });
    const tabCounts = (Object.keys(TAB_MATCH) as VacancyTab[]).reduce((acc, t) => ({ ...acc, [t]: base.filter((r) => TAB_MATCH[t](r.status)).length }), {} as Record<VacancyTab, number>);
    const matched = base.filter((r) => TAB_MATCH[q.tab](r.status)).sort((a, b) => {
      switch (q.sort) {
        case "oldest":
          return cmpIso(a.postedAt, b.postedAt, "asc");
        case "closing":
          return a.closesOn.localeCompare(b.closesOn);
        case "title":
          return cmpText(a.title, b.title);
        default:
          return cmpIso(a.postedAt, b.postedAt, "desc");
      }
    });
    const start = (q.page - 1) * q.pageSize;
    return {
      rows: matched.slice(start, start + q.pageSize),
      total: matched.length,
      tabCounts,
      facets: { departments: getDepartments(true).map((x) => x.name), clients: CONFIG_BASE.clients.filter((c) => clientIdInScope(c.id)).map((c) => ({ id: c.id, name: c.name })), recruiters: CONFIG_BASE.recruiters },
      capabilities: capabilities(),
      workspaceEmpty: all.length === 0,
    };
  },

  async getVacancy(id) {
    await guard();
    if (getPrototypeMode() === "empty") return null;
    const s = store.find((x) => x.id === id && clientIdInScope(x.input.clientId));
    return s ? toDetail(s) : null;
  },

  async createVacancy(input, intent: SaveIntent) {
    await guard();
    const c = capabilities();
    const errors = validate(input, true);
    if (Object.keys(errors).length) throw new VacancyValidationError(errors);
    if (intent === "publish" && !c.canPublish) throw new Error("Not allowed to publish");
    const id = nextId();
    const at = new Date().toISOString();
    const s: Stored = {
      id,
      reference: nextRef(),
      input: structuredClone(input),
      status: "draft",
      postedAt: null,
      endedAt: null,
      counts: { applications: 0, shortlisted: 0, interviewed: 0, placed: 0 },
      activity: [{ id: `${id}-created`, at, actor: ACTOR, action: "Created the vacancy", from: null, to: "Draft" }],
    };
    if (intent === "submit-for-approval") move(s, "submit-for-approval");
    if (intent === "publish") move(s, "publish");
    store = [s, ...store];
    emit();
    return toDetail(s);
  },

  async updateVacancy(id, input, intent) {
    await guard();
    const s = store.find((x) => x.id === id);
    if (!s) throw new Error("Vacancy not found");
    const c = capabilities();
    const errors = validate(input, intent !== "save" || s.input.closesOn !== input.closesOn);
    // Once applications exist a step may be added or renamed but not removed or reordered (proposal, needs Beeliv confirmation).
    if (s.counts.applications > 0) {
      const kept = s.input.journey.filter((p) => input.journey.some((n) => n.id === p.id));
      const inOrder = kept.every((p, i) => input.journey.filter((n) => kept.some((k) => k.id === n.id))[i]?.id === p.id);
      if (kept.length !== s.input.journey.length || !inOrder) errors.journey = "This job already has applications. Steps can be added or renamed, not removed or moved.";
    }
    if (Object.keys(errors).length) throw new VacancyValidationError(errors);
    const eff = effectiveStatus(s);
    if (intent === "publish" && !allowed(eff, c).includes("publish")) throw new Error("Not allowed to publish");
    if (intent === "submit-for-approval" && !allowed(eff, c).includes("submit-for-approval")) throw new Error("Not allowed to submit");
    const entries = diffActivity(s.input, input, id);
    s.input = structuredClone(input);
    s.activity.unshift(...entries.reverse());
    if (intent === "publish") move(s, "publish");
    if (intent === "submit-for-approval") move(s, "submit-for-approval");
    emit();
    return toDetail(s);
  },

  async performAction(id, { action, reason }: ActionInput) {
    await guard();
    const s = store.find((x) => x.id === id);
    if (!s) throw new Error("Vacancy not found");
    if (!allowed(effectiveStatus(s), capabilities()).includes(action)) throw new Error("That action is not allowed");
    if (NEEDS_REASON.includes(action) && !reason?.trim()) throw new Error("A reason is required");
    move(s, action, reason?.trim());
    emit();
    return toDetail(s);
  },
};
