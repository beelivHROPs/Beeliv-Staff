/**
 * DEV FIXTURE for the HR Applicants slice. Everything is FICTIONAL. The
 * `BLV-...` references are PLACEHOLDERS standing in for server-generated
 * values. The stage / status rules below (tab mapping, which action is allowed
 * at which stage, what an action changes) are PROVISIONAL mock behaviour so the
 * UI can be exercised: the spec does not define them and the backend owns them.
 * Replace this file with a Supabase adapter implementing ApplicantsAdapter.
 */
import { APPLICATION_STAGES } from "@/lib/applicant/types";
import { isoOffset } from "@/lib/applicant/time";
import type { AdapterEvent } from "../adapter";
import { cmpIso, cmpText } from "../sort";
import { RestrictedError } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { clientIdInScope } from "../scope";
import type { ApplicantsAdapter } from "./adapter";
import { buildSubmission } from "./submission";
import { addToPool, isMoved, subscribePool } from "../pool-store";
import { getAdminIdentity } from "../ops/identity";
import { syncSelectionDecision } from "../ops/mock";
import { isSeededInPool, seededPoolPerson } from "../talent-pool/mock";
import type {
  ActionInput,
  ActivityRecord,
  ApplicantCapabilities,
  ApplicantDetail,
  ApplicantDocument,
  ApplicantRow,
  ApplicantsPage,
  ApplicantsQuery,
  InternalNote,
  InterviewRecord,
  NextRequiredAction,
  PersonRef,
  StageTab,
} from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();

const ME: PersonRef = { id: "7d2c1f0e-0000-4000-8000-00000000a001", name: "Funke Sample" };
const RECRUITERS: PersonRef[] = [ME, { id: "7d2c1f0e-0000-4000-8000-00000000a002", name: "Kelechi Sample" }];

const CLIENTS = [
  { id: "c-demo-hotel", name: "Demo Hotel Abuja", outlet: "Main building" },
  { id: "c-demo-lounge", name: "Demo Lounge Lagos", outlet: "Victoria Island" },
];
const VACANCIES = [
  { id: "v-waiter", name: "Waiter / Waitress", client: 0 },
  { id: "v-chef", name: "Commis Chef", client: 1 },
  { id: "v-bar", name: "Bar Attendant", client: 1 },
  { id: "v-desk", name: "Front Desk Officer", client: 0 },
  { id: "v-floor", name: "Floor Supervisor", client: 0 },
];

/** name, vacancy, stage, status, shortlisted, recruiter (-1 none), profile %, docs %, days ago */
type Seed = [string, number, number, ApplicantRow["status"], boolean, number, number, number, number];
const SEEDS: Seed[] = [
  ["Ada Sample", 0, 3, "active", true, 0, 100, 60, 12],
  ["Tunde Sample", 1, 2, "active", true, 0, 100, 40, 9],
  ["Chidi Sample", 2, 4, "active", true, 1, 100, 100, 20],
  ["Bisi Sample", 0, 0, "active", false, -1, 70, 0, 1],
  ["Ngozi Sample", 3, 1, "active", true, 0, 100, 20, 6],
  ["Emeka Sample", 4, 5, "active", true, 1, 100, 100, 26],
  ["Zainab Sample", 0, 0, "active", false, -1, 55, 0, 0],
  ["Yusuf Sample", 1, 1, "active", false, 1, 90, 10, 4],
  ["Amaka Sample", 2, 2, "active", true, 0, 100, 30, 8],
  ["Segun Sample", 3, 3, "active", true, 0, 100, 70, 15],
  ["Halima Sample", 0, 4, "active", true, 1, 100, 95, 21],
  ["Ifeanyi Sample", 4, 0, "active", false, -1, 80, 0, 2],
  ["Folake Sample", 1, 6, "active", true, 0, 100, 100, 40],
  ["Gbenga Sample", 2, 1, "hold", false, 1, 85, 0, 14],
  ["Rukky Sample", 0, 2, "rejected", true, 0, 100, 20, 18],
  ["Obinna Sample", 3, 1, "talent-pool", true, 1, 100, 30, 33],
  ["Tola Sample", 4, 7, "active", true, 0, 100, 100, 55],
  ["Maryam Sample", 0, 0, "active", false, -1, 40, 0, 0],
  ["Dayo Sample", 1, 3, "active", true, 1, 100, 50, 11],
  ["Kemi Sample", 2, 0, "active", false, -1, 65, 0, 3],
  ["Uche Sample", 3, 2, "active", true, 0, 100, 25, 7],
  ["Lara Sample", 0, 1, "active", true, 1, 100, 15, 5],
  ["Musa Sample", 4, 3, "hold", true, 0, 100, 45, 19],
  ["Peace Sample", 2, 5, "active", true, 1, 100, 100, 29],
  ["Sade Sample", 1, 1, "talent-pool", true, 0, 100, 20, 48],
  ["Wale Sample", 0, 0, "active", false, -1, 90, 0, 1],
];

type Override = { stage?: number; status?: ApplicantRow["status"]; shortlisted?: boolean; notes: InternalNote[]; activity: ActivityRecord[] };
let overrides = new Map<string, Override>();
subscribePool(() => listeners.forEach((l) => l("reset")));
subscribePrototypeMode(() => {
  overrides = new Map();
  listeners.forEach((l) => l("reset"));
});

const idOf = (i: number) => `a-${String(i + 1).padStart(3, "0")}`;

const NEXT_BY_STAGE: { label: string; attention: boolean }[] = [
  { label: "Review application", attention: true },
  { label: "Shortlist or decline", attention: true },
  { label: "Record interview outcome", attention: false },
  { label: "Chase missing documents", attention: true },
  { label: "Verify documents", attention: true },
  { label: "Waiting for Operations approval", attention: false },
  { label: "Onboarding in progress", attention: false },
  { label: "Assignment in progress", attention: false },
];

function rowOf(i: number): ApplicantRow {
  const [name, v, stage0, status0, sl0, rec, profilePercent, documentsPercent, days] = SEEDS[i];
  const o = overrides.get(idOf(i));
  const stage = o?.stage ?? stage0;
  const moved = isMoved(idOf(i));
  const status = moved ? "talent-pool" : (o?.status ?? status0);
  const vac = VACANCIES[v];
  const client = CLIENTS[vac.client];
  const base = status === "active" ? NEXT_BY_STAGE[stage] : null;
  // For Operations the decision at stage 5 is theirs, not something to wait on.
  const n = base && stage === 5 && isOps() ? { label: "Review and approve the selection", attention: true } : base;
  return {
    id: idOf(i),
    reference: `BLV-APP-PLACEHOLDER-${i + 1}`,
    applicationRef: `BLV-APL-PLACEHOLDER-${i + 1}`,
    name,
    vacancyId: vac.id,
    vacancy: vac.name,
    clientId: client.id,
    client: client.name,
    outlet: client.outlet,
    appliedAt: isoOffset(-days, 10, 15),
    updatedAt: new Date(new Date(isoOffset(-days, 10, 15)).getTime() + stage * 6 * 3_600_000 + (status !== "active" ? 3_600_000 : 0)).toISOString(),
    stage,
    status,
    shortlisted: o?.shortlisted ?? sl0,
    recruiter: rec >= 0 ? RECRUITERS[rec] : null,
    profilePercent,
    documentsPercent,
    nextAction: n ? n.label : null,
    needsAttention: n?.attention ?? false,
    inTalentPool: status === "talent-pool",
  };
}

/** PROVISIONAL tab mapping (needs Beeliv confirmation): New = stage 1; Shortlisted = reviewed and shortlisted; Documentation = Documentation + Verification. */
function inTab(r: ApplicantRow, tab: StageTab): boolean {
  switch (tab) {
    case "all":
      return true;
    case "talent-pool":
      return r.status === "talent-pool";
    case "new":
      return r.status === "active" && r.stage === 0;
    case "shortlisted":
      return r.status === "active" && r.stage === 1 && r.shortlisted;
    case "interview":
      return r.status === "active" && r.stage === 2;
    case "documentation":
      return r.status === "active" && (r.stage === 3 || r.stage === 4);
    case "approval":
      return r.status === "active" && r.stage === 5;
  }
}

function matchesStage(r: ApplicantRow, stage: string): boolean {
  if (!stage) return true;
  if (stage === "hold" || stage === "rejected") return r.status === stage;
  if (stage === "placed") return r.status === "active" && r.stage >= 6;
  return r.stage === Number(stage);
}

const TABS: StageTab[] = ["all", "new", "shortlisted", "interview", "documentation", "approval", "talent-pool"];

/** Sort on full ISO timestamps. "Last updated" is mock-derived from stage and applied time (the real adapter returns updatedAt). */
function sortApplicants(a: ApplicantRow, b: ApplicantRow, sort: string): number {
  switch (sort) {
    case "oldest":
      return cmpIso(a.appliedAt, b.appliedAt, "asc");
    case "name":
      return cmpText(a.name, b.name);
    case "updated":
      return cmpIso(a.updatedAt, b.updatedAt, "desc");
    default:
      return cmpIso(a.appliedAt, b.appliedAt, "desc");
  }
}

async function gate() {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  await sleep(350);
  if (mode === "error") throw new Error("Mock error");
  return mode;
}

/** Prototype stand-in for the signed-in Head of Operations (the real name comes from the session). */
const OPS_NAME = "Adaeze Sample (Head of Operations)";
const isOps = () => getAdminIdentity() === "ops";

function capabilitiesOf(r: ApplicantRow): ApplicantCapabilities {
  const live = r.status === "active";
  // The selection decision is due once documents are verified (stage 4) or HR has submitted it (stage 5).
  const decisionDue = live && ((r.stage === 4 && r.documentsPercent >= 90) || r.stage === 5);
  const ops = isOps();
  return {
    canShortlist: live && r.stage <= 1 && !(r.stage === 1 && r.shortlisted),
    canHold: live,
    canReject: live || r.status === "hold",
    canRequestInfo: live || r.status === "hold",
    // HR submits; Operations does NOT submit, it decides (project lead 2026-10-17; rbac.md; docs/contracts/ops-approvals.md).
    canSubmitForApproval: !ops && live && r.stage === 4 && r.documentsPercent >= 90,
    canApproveSelection: ops && decisionDue, // HR never approves; Head of Operations does
    canAddNote: true,
    canMoveToTalentPool: r.status !== "talent-pool",
  };
}

function nextRequired(r: ApplicantRow): NextRequiredAction {
  if (r.status === "hold") return { title: "On hold", detail: "No action is waiting. Reject, or ask for more information, once the hold reason is resolved.", owner: "none" };
  if (r.status === "rejected") return { title: "Rejected", detail: "The record is retained for history. No further action.", owner: "none" };
  if (r.status === "talent-pool") return { title: "In the talent pool", detail: "Consider this person when a similar vacancy opens.", owner: "none" };
  switch (r.stage) {
    case 0:
      return { title: "Review the application", detail: "Check the profile and screening answers, then shortlist, hold or reject.", owner: "hr" };
    case 1:
      return r.shortlisted
        ? { title: "Schedule an interview", detail: "Shortlisted. Book the interview or assessment.", owner: "hr" }
        : { title: "Decide: shortlist or decline", detail: "The application has been reviewed but not decided.", owner: "hr" };
    case 2:
      return { title: "Record the interview outcome", detail: "Add the recommendation once the interview or assessment is done.", owner: "hr" };
    case 3:
      return { title: "Waiting for documents", detail: "Some required documents are missing. Request them from the applicant.", owner: "applicant" };
    case 4:
      if (isOps())
        return r.documentsPercent >= 90
          ? { title: "Review and approve the selection", detail: "Documents are verified. The decision is yours: approve the selection, or decline it.", owner: "you" }
          : { title: "Verify documents", detail: "Documents must be verified before the selection can be approved.", owner: "hr" };
      return r.documentsPercent >= 90
        ? { title: "Submit for approval", detail: "Documents are verified. Submit the selection to Operations for approval.", owner: "hr" }
        : { title: "Verify documents", detail: "Review uploaded documents before the selection can be submitted.", owner: "hr" };
    case 5:
      if (isOps()) return { title: "Review and approve the selection", detail: "HR has submitted this selection. The decision is yours: approve it, or decline it.", owner: "you" };
      return { title: "Awaiting Operations approval", detail: "Submitted. Final approval belongs to the Head of Operations.", owner: "operations" };
    default:
      return { title: "Onboarding and assignment", detail: "Handled in the Staff workflow after approval.", owner: "none" };
  }
}

function documentsOf(r: ApplicantRow): ApplicantDocument[] {
  const p = r.documentsPercent;
  const st = (min: number): ApplicantDocument["state"] => (p >= min + 25 ? "verified" : p >= min ? "needs-review" : "missing");
  const cv = st(0);
  return [
    { id: `${r.id}-cv`, type: "CV", group: "cv", state: cv === "missing" ? "uploaded" : cv, uploadedAt: isoOffset(-3, 9, 0), reviewer: null },
    { id: `${r.id}-photo`, type: "Passport photograph", group: "checklist", state: st(20), uploadedAt: p >= 20 ? isoOffset(-2, 11, 0) : null, reviewer: p >= 45 ? ME.name : null },
    { id: `${r.id}-id`, type: "Identity document", group: "checklist", state: st(40), uploadedAt: p >= 40 ? isoOffset(-2, 12, 0) : null, reviewer: p >= 65 ? ME.name : null },
    { id: `${r.id}-guarantor`, type: "Guarantor form", group: "guarantor-reference", state: st(60), uploadedAt: p >= 60 ? isoOffset(-1, 9, 30) : null, reviewer: p >= 85 ? ME.name : null },
    { id: `${r.id}-ref`, type: "Reference letter", group: "guarantor-reference", state: st(75), uploadedAt: p >= 75 ? isoOffset(-1, 10, 30) : null, reviewer: p >= 100 ? ME.name : null },
  ];
}

function interviewsOf(r: ApplicantRow): InterviewRecord[] {
  if (r.stage < 2)
    return [
      { id: `${r.id}-i`, kind: "interview", title: "Interview", at: null, interviewer: null, state: "not-scheduled", recommendation: null },
      { id: `${r.id}-a`, kind: "assessment", title: "Practical assessment", at: null, interviewer: null, state: "not-scheduled", recommendation: null },
    ];
  const done = r.stage > 2;
  return [
    { id: `${r.id}-i`, kind: "interview", title: "Interview", at: isoOffset(done ? -6 : 2, 11, 0), interviewer: "Kelechi Sample", state: done ? "completed" : "scheduled", recommendation: done ? "Recommend" : null },
    { id: `${r.id}-a`, kind: "assessment", title: "Practical assessment", at: isoOffset(done ? -5 : 3, 14, 0), interviewer: "Funke Sample", state: done ? "completed" : "scheduled", recommendation: done ? "Meets the standard" : null },
  ];
}

function detailOf(i: number): ApplicantDetail {
  const r = rowOf(i);
  const o = overrides.get(r.id);
  const activity: ActivityRecord[] = [
    ...(o?.activity ?? []),
    ...(r.stage >= 1
      ? [{ id: `${r.id}-h2`, actor: ME.name, at: isoOffset(-Math.max(0, Math.floor((Date.now() - new Date(r.appliedAt).getTime()) / 864e5) - 1), 15, 0), action: "Moved to review", from: APPLICATION_STAGES[0] as string | null, to: APPLICATION_STAGES[1] as string | null }]
      : []),
    { id: `${r.id}-h1`, actor: r.name, at: r.appliedAt, action: "Submitted application", from: null, to: APPLICATION_STAGES[0] },
  ].sort((a, b) => b.at.localeCompare(a.at));
  const base: Omit<ApplicantDetail, "screening" | "submission"> = {
    ...r,
    email: `${r.name.split(" ")[0].toLowerCase()}@example.test`,
    phone: "+234 800 000 0000",
    location: "Abuja, Nigeria",
    professionalSummary: "Hospitality professional with front-of-house experience in busy venues. (Sample text.)",
    experience: [
      { role: "Server", employer: "Sample Restaurant", period: "2022 - 2024" },
      { role: "Host", employer: "Sample Cafe", period: "2020 - 2022" },
    ],
    skills: ["Guest service", "POS systems", "Table service", "Teamwork"],
    availability: "Immediate",
    preferredLocations: ["Abuja", "Lagos"],
    // Varies by person so both the authorised and the not-authorised presentation can be seen.
    expectedSalary: i % 5 === 4 ? { allowed: false } : { allowed: true, value: "NGN 120,000 - 150,000 / month" },
    sensitive: [
      { label: "NIN", masked: "*******7421", revealPermitted: false },
      { label: "Bank account", masked: "******3098", revealPermitted: false },
    ],
    employmentType: "Full time",
    interviewState: r.stage < 2 ? "Not scheduled" : r.stage === 2 ? "Scheduled" : "Completed",
    assessmentState: r.stage < 2 ? "Not scheduled" : r.stage === 2 ? "Scheduled" : "Completed",
    nextRequired: nextRequired(r),
    capabilities: capabilitiesOf(r),
    documents: documentsOf(r),
    interviews: interviewsOf(r),
    notes: [...(o?.notes ?? []), { id: `${r.id}-n0`, author: "Kelechi Sample", at: isoOffset(-2, 16, 20), body: "Spoke by phone. Confident and punctual. (Sample note.)" }].sort((a, b) => b.at.localeCompare(a.at)),
    activity,
  };
  const built = buildSubmission(base, i);
  return { ...base, screening: built.screening, submission: built.submission };
}

/** Other mock feeds (Home interviews/applications) use `a-uuid-000N`; they mean the same seeded person as `a-00N`. */
const canonicalId = (id: string) => id.replace(/^a-uuid-0*(\d+)$/, (_, n: string) => `a-${n.padStart(3, "0")}`);
const indexOf = (id: string) => SEEDS.findIndex((_, i) => idOf(i) === canonicalId(id));
const ts = () => new Date().toISOString();

export const mockApplicantsAdapter: ApplicantsAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  async listApplicants(q: ApplicantsQuery): Promise<ApplicantsPage> {
    const mode = await gate();
    const all = mode === "empty" ? [] : SEEDS.map((_, i) => rowOf(i)).filter((r) => clientIdInScope(r.clientId));
    const needle = q.search.trim().toLowerCase();
    const base = all.filter(
      (r) =>
        (!needle || [r.name, r.vacancy, r.client, r.reference, r.applicationRef].some((s) => s.toLowerCase().includes(needle))) &&
        (!q.vacancyId || r.vacancyId === q.vacancyId) &&
        (!q.clientId || r.clientId === q.clientId) &&
        (!q.recruiterId || (q.recruiterId === "none" ? r.recruiter === null : r.recruiter?.id === q.recruiterId)) &&
        matchesStage(r, q.stage),
    );
    const tabCounts = Object.fromEntries(TABS.map((t) => [t, base.filter((r) => inTab(r, t)).length])) as Record<StageTab, number>;
    const matched = base.filter((r) => inTab(r, q.tab)).sort((a, b) => sortApplicants(a, b, q.sort));
    const start = (Math.max(1, q.page) - 1) * q.pageSize;
    return {
      rows: matched.slice(start, start + q.pageSize),
      tabCounts,
      total: matched.length,
      workspaceEmpty: all.length === 0,
      facets: {
        vacancies: VACANCIES.map((v) => ({ id: v.id, name: v.name })),
        clients: CLIENTS.filter((c) => clientIdInScope(c.id)).map((c) => ({ id: c.id, name: c.name })),
        recruiters: RECRUITERS,
      },
    };
  },

  async getApplicant(id) {
    const mode = await gate();
    if (mode === "empty") return null;
    // PROTOTYPE scope guard: a record outside the signed-in identity's clients behaves like the lists do.
    // The REAL enforcement is server-side (grant + RLS on every detail read); this only keeps the prototype honest.
    const i = indexOf(id);
    if (i >= 0) {
      if (!clientIdInScope(rowOf(i).clientId)) throw new RestrictedError();
      return detailOf(i);
    }
    // Talent-pool rows carry their own `a-uuid-tp-N` ids. Open a profile built from a
    // sample record, with the pool person's own name and place on top of it.
    const p = seededPoolPerson(id);
    const n = Number(/^a-uuid-tp-(\d+)$/.exec(id)?.[1]);
    if (!p || !n) return null;
    const d = detailOf((n - 1) % SEEDS.length);
    if (!clientIdInScope(d.clientId)) throw new RestrictedError();
    const first = p.name.split(" ")[0].toLowerCase();
    return { ...d, id, name: p.name, email: `${first}@example.test`, location: p.location, status: "talent-pool", inTalentPool: true, nextAction: null, needsAttention: false, reference: `BLV-APP-PLACEHOLDER-TP${n}` };
  },

  async performAction(id, input: ActionInput) {
    await sleep(400);
    const i = indexOf(id);
    if (i < 0) throw new RestrictedError("Unknown applicant");
    const before = rowOf(i);
    const cap = capabilitiesOf(before);
    const o = overrides.get(id) ?? { notes: [], activity: [] };
    const actor = isOps() ? OPS_NAME : ME.name;
    let action = "";
    let to: string | null = null;
    switch (input.action) {
      case "shortlist":
        if (!cap.canShortlist) throw new RestrictedError();
        o.stage = 1;
        o.shortlisted = true;
        action = "Shortlisted";
        to = `${APPLICATION_STAGES[1]} (shortlisted)`;
        break;
      case "hold":
        if (!cap.canHold) throw new RestrictedError();
        o.status = "hold";
        action = "Put on hold";
        to = "On hold";
        break;
      case "reject":
        if (!cap.canReject) throw new RestrictedError();
        o.status = "rejected";
        action = "Rejected";
        to = "Rejected";
        // Operations declining a selection that is due also closes the matching approval record.
        if (cap.canApproveSelection) syncSelectionDecision({ applicantId: id, name: before.name, role: before.vacancy, clientId: before.clientId }, "reject", input.note?.trim());
        break;
      case "request-info":
        if (!cap.canRequestInfo) throw new RestrictedError();
        action = "Requested more information";
        break;
      case "talent-pool": {
        if (!cap.canMoveToTalentPool) throw new RestrictedError();
        const vac = VACANCIES.find((v) => v.id === before.vacancyId) ?? VACANCIES[0];
        const reason = before.status === "rejected" ? "not-selected" : before.shortlisted ? "shortlisted-unplaced" : "not-selected";
        addToPool(
          { applicantId: id, name: before.name, location: "Abuja", department: "Hospitality", vacancyId: vac.id, vacancyTitle: vac.name, reason, note: input.note?.trim() || null, skills: ["Guest service", "POS systems"] },
          isSeededInPool,
        );
        o.status = "talent-pool";
        action = "Moved to Talent Pool";
        to = "Talent pool";
        break;
      }
      case "submit-for-approval":
        if (!cap.canSubmitForApproval) throw new RestrictedError();
        o.stage = 5;
        action = "Submitted for approval";
        to = APPLICATION_STAGES[5];
        break;
      case "approve-selection":
        if (!cap.canApproveSelection) throw new RestrictedError();
        o.stage = 6;
        action = "Approved the selection";
        to = APPLICATION_STAGES[6];
        syncSelectionDecision({ applicantId: id, name: before.name, role: before.vacancy, clientId: before.clientId }, "approve");
        break;
    }
    const fromLabel = before.status === "active" ? APPLICATION_STAGES[before.stage] : before.status === "hold" ? "On hold" : before.status;
    o.activity = [{ id: `${id}-${ts()}`, actor, at: ts(), action: input.note ? `${action}: ${input.note}` : action, from: to ? fromLabel : null, to }, ...o.activity];
    overrides.set(id, o);
    return detailOf(i);
  },

  async addNote(id, body) {
    await sleep(250);
    const i = indexOf(id);
    if (i < 0) throw new RestrictedError("Unknown applicant");
    const o = overrides.get(id) ?? { notes: [], activity: [] };
    o.notes = [{ id: `${id}-n-${ts()}`, author: ME.name, at: ts(), body }, ...o.notes];
    o.activity = [{ id: `${id}-na-${ts()}`, actor: ME.name, at: ts(), action: "Added an internal note", from: null, to: null }, ...o.activity];
    overrides.set(id, o);
    return detailOf(i);
  },
};
