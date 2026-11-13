/**
 * DEV FIXTURE for Interviews. Everything is FICTIONAL ("Sample" people).
 * Stages and scoring criteria are served as DATA (configurable, spec 6.4); the
 * defaults below need Beeliv confirmation. Writes are in-memory and append
 * history entries; they reset with the Prototype state control.
 * Replace with a Supabase adapter implementing InterviewsAdapter; no screen changes.
 *
 * Preview helper: add `?state=restricted` to any of the three recruitment
 * screens (Shortlisting, Interviews, Assessments) to see the unauthorized state.
 */
import { isoOffset } from "@/lib/applicant/time";
import { RestrictedError, type AdapterEvent } from "../adapter";
import { cmpIso, cmpText } from "../sort";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { textInScope } from "../scope";
import { getInterviewStages, getScoringCriteria } from "../lists/store";
import { canDo, roleForIdentity } from "../role-access";
import { getAdminIdentity, subscribeAdminIdentity } from "../ops/identity";
import { journeyOfVacancyTitle } from "../vacancies/mock";
import { SCORER_ROLES, interviewSteps, type JourneyStep, type ScorerRole } from "@/lib/journeys/types";
import type { InterviewsAdapter } from "./adapter";
import { readRequests, resolveRequest, type InterviewTimeRequest } from "@/lib/bridge/interview-requests";
import {
  METHOD_LABEL,
  RECOMMENDATION_LABEL,
  type Conflict,
  type InterviewDetail,
  type InterviewHistoryEntry,
  type InterviewMethod,
  type InterviewRecommendation,
  type InterviewRow,
  type InterviewsPage,
  type InterviewsQuery,
  type InterviewStage,
  type InterviewStatus,
  type PersonRef,
  type Scorecard,
  type ScoringCriterion,
} from "./types";

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const forever = () => new Promise<never>(() => {});

/** Shared by the three recruitment mocks: loading / error modes, plus the restricted preview. */
export async function previewGate(ms = 300) {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("state") === "restricted") {
    await sleep(200);
    throw new RestrictedError();
  }
  await sleep(ms);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
  return mode;
}

const listeners = new Set<(e: AdapterEvent) => void>();

const ME = "Funke Sample";
const INTERVIEWERS: PersonRef[] = [
  { id: "7d2c1f0e-0000-4000-8000-00000000a001", name: "Funke Sample" },
  { id: "7d2c1f0e-0000-4000-8000-00000000a002", name: "Kelechi Sample" },
  { id: "7d2c1f0e-0000-4000-8000-00000000a003", name: "Demo Hotel panel" },
];

const STAGES: InterviewStage[] = [
  { id: "hr-screening", name: "HR Screening", appliesNote: null },
  { id: "beeliv-interview", name: "Beeliv Interview", appliesNote: null },
  { id: "client-interview", name: "Client Interview", appliesNote: "Where the client requires it" },
  { id: "practical", name: "Practical Assessment", appliesNote: "Where the role requires it" },
  { id: "final-review", name: "Final Review", appliesNote: null },
];

const CRITERIA: Record<string, ScoringCriterion[]> = {
  default: [
    { id: "c-comm", label: "Communication", hint: "Clear, polite, easy to follow", scale: 5, weight: 1 },
    { id: "c-service", label: "Service attitude", hint: "Warmth and willingness to help guests", scale: 5, weight: 1 },
    { id: "c-experience", label: "Relevant experience", hint: "Matches the role and setting", scale: 5, weight: 1 },
    { id: "c-grooming", label: "Presentation and grooming", hint: null, scale: 5, weight: 1 },
    { id: "c-team", label: "Teamwork and reliability", hint: "Examples of working with others", scale: 5, weight: 1 },
  ],
  practical: [
    { id: "p-skill", label: "Technical skill", hint: "Carries out the task to standard", scale: 5, weight: 1 },
    { id: "p-speed", label: "Speed and organisation", hint: null, scale: 5, weight: 1 },
    { id: "p-hygiene", label: "Hygiene and safety", hint: null, scale: 5, weight: 1 },
    { id: "p-guest", label: "Guest handling", hint: null, scale: 5, weight: 1 },
  ],
};
// Shared fallback criteria and the stage names come from Lists & Rules (/admin/lists); the practical set stays fixed here.
// When the vacancy's journey has this interview stage, its OWN stage name, defaults, scorecard and "who may score" win.
const legacyCriteriaOf = (stageId: string): ScoringCriterion[] =>
  stageId === "practical" ? CRITERIA.practical : getScoringCriteria().map((c) => ({ id: c.id, label: c.name, hint: c.hint, scale: 5, weight: 1 }));
const configuredStages = (): InterviewStage[] =>
  getInterviewStages().map((s) => ({ id: s.id, name: s.name, appliesNote: STAGES.find((x) => x.id === s.id)?.appliesNote ?? (s.onlyWhereRequired ? "Where required" : null) }));

/** The interview step of this stage in the vacancy's journey (interview step id = stage id), or null. */
function stepOf(vacancyName: string, stageId: string): JourneyStep | null {
  return interviewSteps(journeyOfVacancyTitle(vacancyName) ?? []).find((s) => s.id === stageId) ?? null;
}
const criteriaOf = (vacancyName: string, stageId: string): ScoringCriterion[] => {
  const step = stepOf(vacancyName, stageId);
  return step?.interview ? step.interview.criteria.map((c) => ({ id: c.id, label: c.label, hint: null, scale: c.scale, weight: c.weight })) : legacyCriteriaOf(stageId);
};
const scorersOf = (vacancyName: string, stageId: string): ScorerRole[] => stepOf(vacancyName, stageId)?.interview?.whoMayScore ?? SCORER_ROLES;
const myRole = () => roleForIdentity(getAdminIdentity());
/** Role check for the mock. The real check is server-side against the stage's whoMayScore and the actor's client scope. */
const mayScore = (vacancyName: string, stageId: string) => canDo("interviews.score") && scorersOf(vacancyName, stageId).includes(myRole());

const VACANCIES = [
  { id: "v-waiter", name: "Waiter / Waitress", client: "Demo Hotel Abuja" },
  { id: "v-chef", name: "Commis Chef", client: "Demo Lounge Lagos" },
  { id: "v-bar", name: "Bar Attendant", client: "Demo Lounge Lagos" },
  { id: "v-desk", name: "Front Desk Officer", client: "Demo Hotel Abuja" },
  { id: "v-floor", name: "Floor Supervisor", client: "Demo Hotel Abuja" },
];

interface Item {
  row: InterviewRow;
  applicantRef: string;
  scorecard: Scorecard;
  history: InterviewHistoryEntry[];
}

/** applicant idx (a-NNN), name, vacancy idx, stage, day offset (null = not yet booked), hour, interviewer idx, method, status, ratings, recommendation */
type Seed = [number, string, number, string, number | null, number, number, InterviewMethod, InterviewStatus, number[] | null, InterviewRecommendation | null];
const SEEDS: Seed[] = [
  [2, "Tunde Sample", 1, "beeliv-interview", 0, 14, 0, "in-person", "scheduled", null, null],
  [3, "Chidi Sample", 2, "practical", 1, 10, 1, "in-person", "scheduled", null, null],
  [5, "Ngozi Sample", 3, "hr-screening", -2, 11, 0, "phone", "completed", [4, 4, 3, 5, 4], "proceed"],
  [9, "Amaka Sample", 2, "beeliv-interview", -1, 15, 1, "video", "scheduled", null, null],
  [11, "Halima Sample", 0, "practical", 3, 11, 2, "in-person", "scheduled", null, null],
  [10, "Segun Sample", 3, "beeliv-interview", null, 10, 0, "in-person", "to-schedule", null, null],
  [13, "Folake Sample", 1, "practical", -6, 13, 1, "video", "completed", [5, 5, 4, 4, 5], "proceed"],
  [19, "Dayo Sample", 1, "hr-screening", 2, 9, 0, "phone", "scheduled", null, null],
  [21, "Uche Sample", 3, "beeliv-interview", -4, 12, 1, "in-person", "completed", [2, 3, 2, 3, 2], "reject"],
  [22, "Lara Sample", 0, "practical", null, 9, 0, "phone", "to-schedule", null, null],
  [23, "Musa Sample", 4, "beeliv-interview", -3, 14, 0, "in-person", "completed", [3, 3, 4, 3, 3], "another-stage"],
  [24, "Peace Sample", 2, "practical", 4, 10, 1, "in-person", "scheduled", null, null],
  [1, "Ada Sample", 0, "practical", -8, 10, 1, "in-person", "cancelled", null, null],
  [6, "Emeka Sample", 4, "client-interview", 5, 15, 2, "video", "scheduled", null, null],
  [14, "Gbenga Sample", 4, "beeliv-interview", -1, 16, 1, "phone", "scheduled", null, null],
];

const aId = (n: number) => `a-${String(n).padStart(3, "0")}`;
const iId = (i: number) => `i-${String(i + 1).padStart(3, "0")}`;

function nextActionOf(r: InterviewRow): { label: string | null; attention: boolean } {
  if (r.status === "to-schedule") return { label: "Schedule interview", attention: true };
  if (r.status === "cancelled") return { label: "Reschedule or close", attention: false };
  if (r.status === "scheduled" && r.at && new Date(r.at).getTime() < Date.now()) return { label: "Record outcome", attention: true };
  if (r.status === "scheduled") return { label: "Interview upcoming", attention: false };
  if (r.recommendation === "another-stage") return { label: "Book the next stage", attention: false };
  return { label: null, attention: false };
}

function withNext(r: InterviewRow): InterviewRow {
  const n = nextActionOf(r);
  return { ...r, nextAction: n.label, needsAttention: n.attention };
}

/** Guide total only: the sum of rating x weight over the stage's criteria. It never decides anything. */
function applyScore(r: InterviewRow, sc: Scorecard): InterviewRow {
  const crit = criteriaOf(r.vacancy, r.stageId);
  const any = Object.keys(sc.ratings).length > 0;
  const total = crit.reduce((a, c) => a + (sc.ratings[c.id] ?? 0) * c.weight, 0);
  const max = crit.reduce((a, c) => a + c.scale * c.weight, 0);
  return { ...r, totalScore: any ? total : null, maxScore: any ? max : null, recommendation: sc.recommendation };
}

/** Stage name and defaults follow the vacancy's journey when it has this stage (so a rename shows everywhere). */
function live(r: InterviewRow): InterviewRow {
  const c = stepOf(r.vacancy, r.stageId)?.interview;
  if (!c) return { ...r, defaults: null };
  return { ...r, stageName: c.stageName, defaults: { method: c.defaultMethod, minutes: c.defaultMinutes }, durationMins: r.status === "to-schedule" ? c.defaultMinutes : r.durationMins };
}

function build(): Item[] {
  return SEEDS.map(([n, name, v, stageId, day, hour, who, method, status, ratings, rec], i) => {
    const vac = VACANCIES[v];
    const stage = STAGES.find((s) => s.id === stageId) ?? STAGES[0];
    const crit = criteriaOf(vac.name, stageId);
    const ratingMap: Record<string, number> = {};
    ratings?.forEach((x, k) => {
      if (crit[k]) ratingMap[crit[k].id] = x;
    });
    const at = day === null ? null : isoOffset(day, hour, 0);
    const scorecard: Scorecard = { ratings: ratingMap, notes: ratings ? "Sample interviewer notes recorded after the session." : "", recommendation: rec, submittedAt: ratings && at ? at : null, submittedBy: ratings ? INTERVIEWERS[who].name : null };
    const base: InterviewRow = {
      id: iId(i),
      applicantId: aId(n),
      candidateName: name,
      vacancyId: vac.id,
      vacancy: vac.name,
      client: vac.client,
      stageId,
      stageName: stage.name,
      at,
      durationMins: 45,
      interviewer: status === "to-schedule" ? null : INTERVIEWERS[who],
      method: status === "to-schedule" ? null : method,
      location: method === "in-person" && status !== "to-schedule" ? `${vac.client}, meeting room` : null,
      link: method === "video" && status !== "to-schedule" ? "https://meet.example.com/sample-room" : null,
      defaults: null,
      status,
      totalScore: null,
      maxScore: null,
      recommendation: null,
      nextAction: null,
      needsAttention: false,
    };
    const history: InterviewHistoryEntry[] = [{ id: `${iId(i)}-h1`, actor: ME, at: isoOffset(-10, 9, 30), action: status === "to-schedule" ? "Moved to this stage" : "Interview scheduled", from: null, to: stage.name, note: null }];
    if (ratings) history.push({ id: `${iId(i)}-h2`, actor: INTERVIEWERS[who].name, at: at ?? isoOffset(-1), action: "Scorecard submitted", from: null, to: rec ? RECOMMENDATION_LABEL[rec] : null, note: null });
    if (status === "cancelled") history.push({ id: `${iId(i)}-h3`, actor: ME, at: isoOffset(-9, 10, 0), action: "Interview cancelled", from: "Scheduled", to: "Cancelled", note: "Candidate asked for a later date." });
    return { row: withNext(applyScore(base, scorecard)), applicantRef: `BLV-APP-PLACEHOLDER-${n}`, scorecard, history };
  });
}

/* ---------- candidate requests from the Applicant mock ("Can't make this time") ---------- */

const BRIDGED_PREFIX = "i-req-";
export const bridgedInterviewId = (requestId: string) => `${BRIDGED_PREFIX}${requestId}`;
const requestIdOf = (interviewId: string) => (interviewId.startsWith(BRIDGED_PREFIX) ? interviewId.slice(BRIDGED_PREFIX.length) : null);

/**
 * The Applicant mock's own interview becomes an interview in this fixture so HR can
 * reschedule it from the Inbox case. FIXTURE MAPPING: the Applicant sample client is
 * treated as the assigned demo client "Demo Hotel Abuja", so it stays in an HR officer's scope.
 */
function bridgedItem(req: InterviewTimeRequest): Item {
  const vacancyName = req.applicationLabel.split("·")[0].trim();
  const vac = VACANCIES.find((v) => v.name === vacancyName) ?? VACANCIES[0];
  const stage = STAGES[1];
  const out = req.status === "rescheduled" ? req.outcome : undefined;
  const modeText = out?.mode ?? req.mode ?? "";
  const method: InterviewMethod = /video/i.test(modeText) ? "video" : /phone/i.test(modeText) ? "phone" : "in-person";
  const link = (out ? out.meetingLink : req.meetingLink) ?? null;
  const base: InterviewRow = {
    id: bridgedInterviewId(req.id),
    applicantId: `a-req-${req.id}`,
    candidateName: req.applicantName,
    vacancyId: vac.id,
    vacancy: vac.name,
    client: vac.client,
    stageId: stage.id,
    stageName: stage.name,
    at: out?.scheduledAt ?? req.scheduledAt,
    durationMins: out?.durationMinutes ?? req.durationMinutes ?? 45,
    interviewer: INTERVIEWERS[0],
    method,
    location: method === "in-person" ? `${vac.client}, meeting room` : null,
    link: method === "video" ? link : null,
    defaults: null,
    status: req.status === "cancelled" ? "cancelled" : "scheduled",
    totalScore: null,
    maxScore: null,
    recommendation: null,
    nextAction: null,
    needsAttention: false,
  };
  const id = base.id;
  const history: InterviewHistoryEntry[] = [{ id: `${id}-h1`, actor: ME, at: isoOffset(-3, 9, 30), action: "Interview scheduled", from: null, to: stage.name, note: null }];
  history.push({ id: `${id}-h2`, actor: req.applicantName, at: req.requestedAt, action: "Candidate said they cannot make this time", from: null, to: null, note: [req.reason, req.note].filter(Boolean).join(". ") });
  if (req.outcome) {
    history.push({ id: `${id}-h3`, actor: ME, at: req.outcome.decidedAt, action: req.status === "cancelled" ? "Interview cancelled" : "Interview rescheduled", from: "Scheduled", to: req.status === "cancelled" ? "Cancelled" : "Scheduled", note: req.outcome.reason });
  }
  if (req.status === "withdrawn") {
    history.push({ id: `${id}-h3`, actor: req.applicantName, at: req.withdrawnAt ?? req.requestedAt, action: "Applicant withdrew the request", from: null, to: null, note: null });
  }
  const scorecard: Scorecard = { ratings: {}, notes: "", recommendation: null, submittedAt: null, submittedBy: null };
  return { row: withNext(applyScore(base, scorecard)), applicantRef: `BLV-APP-PLACEHOLDER-${req.id}`, scorecard, history };
}

/** Adds an interview for every candidate request that is not here yet (also after a reload or a prototype reset). */
function syncBridged() {
  if (typeof window === "undefined") return;
  const missing = readRequests().filter((r) => !items.some((x) => x.row.id === bridgedInterviewId(r.id)));
  if (missing.length) items = [...items, ...missing.map(bridgedItem)];
}

/** Tell the Applicant mock what HR decided, when the interview came from a candidate's request. */
function publishOutcome(interviewId: string, status: "rescheduled" | "cancelled", o: Parameters<typeof resolveRequest>[2]) {
  const requestId = requestIdOf(interviewId);
  if (requestId) resolveRequest(requestId, status, o);
}

let items: Item[] = build();
subscribePrototypeMode(() => {
  items = build();
  listeners.forEach((l) => l("reset"));
});

function detailOf(it: Item): InterviewDetail {
  const r = live(it.row);
  const open = r.status !== "cancelled";
  // The stages come from the vacancy's own journey when it has interview steps, else the shared list.
  const own = interviewSteps(journeyOfVacancyTitle(r.vacancy) ?? []);
  const stages = own.length ? own.map((s) => ({ id: s.id, name: s.interview?.stageName ?? "Interview" })) : STAGES.map((s) => ({ id: s.id, name: s.name }));
  const pathway = stages.map((s) => {
    const mine = items.find((x) => x.row.applicantId === r.applicantId && x.row.stageId === s.id);
    return { stageId: s.id, stageName: s.name, state: (mine ? mine.row.status : "not-required") as InterviewStatus | "not-required", at: mine?.row.at ?? null };
  });
  return {
    ...r,
    applicantReference: it.applicantRef,
    interviewerOptions: INTERVIEWERS,
    criteria: criteriaOf(r.vacancy, r.stageId),
    whoMayScore: scorersOf(r.vacancy, r.stageId),
    scorecard: it.scorecard,
    pathway,
    history: [...it.history].sort((a, b) => b.at.localeCompare(a.at)),
    capabilities: {
      canSchedule: r.status === "to-schedule",
      canReschedule: r.status === "scheduled" || r.status === "cancelled",
      canCancel: r.status === "scheduled",
      // Who may score is the stage's own setting (HR officer / HR Manager / Operations) and the role's interviews.score capability.
      canScore: open && (r.status === "scheduled" || r.status === "completed") && mayScore(r.vacancy, r.stageId),
    },
  };
}

function matches(r: InterviewRow, q: InterviewsQuery, tab: boolean): boolean {
  if (!textInScope(r.client)) return false;
  const needle = q.search.trim().toLowerCase();
  if (needle && ![r.candidateName, r.vacancy, r.client, r.stageName, r.interviewer?.name ?? ""].some((s) => s.toLowerCase().includes(needle))) return false;
  if (q.stageId && r.stageId !== q.stageId) return false;
  if (q.vacancyId && r.vacancyId !== q.vacancyId) return false;
  if (q.interviewerId && r.interviewer?.id !== q.interviewerId) return false;
  if (q.range) {
    if (!r.at || r.status === "cancelled" || r.at < q.range.from || r.at >= q.range.to) return false;
  }
  if (!tab) return true;
  const past = !!r.at && new Date(r.at).getTime() < Date.now();
  switch (q.tab) {
    case "all":
      return true;
    case "to-schedule":
      return r.status === "to-schedule";
    case "upcoming":
      return r.status === "scheduled" && !past;
    case "needs-outcome":
      return r.status === "scheduled" && past;
    case "completed":
      return r.status === "completed";
  }
}

function mutate(id: string, fn: (it: Item) => Item): InterviewDetail {
  const idx = items.findIndex((x) => x.row.id === id);
  if (idx < 0) throw new Error("Unknown interview");
  const next = fn(items[idx]);
  next.row = withNext(applyScore(next.row, next.scorecard));
  items = items.map((x, k) => (k === idx ? next : x));
  return detailOf(next);
}

const hist = (it: Item, action: string, from: string | null, to: string | null, note: string | null): InterviewHistoryEntry[] => [
  ...it.history,
  { id: `${it.row.id}-h${it.history.length + 1}`, actor: ME, at: new Date().toISOString(), action, from, to, note },
];
const STATUS_LABEL: Record<InterviewStatus, string> = { "to-schedule": "To schedule", scheduled: "Scheduled", completed: "Completed", cancelled: "Cancelled" };

/** Meeting link: optional; when given it must be https, plain text, at most 300 characters. The backend validates again. */
function assertLink(input: { method: InterviewMethod; link: string }) {
  const link = input.link.trim();
  if (input.method === "video" && link && (link.length > 300 || !/^https:\/\/\S+$/i.test(link))) throw new Error("The meeting link must start with https:// and be at most 300 characters");
}

// A change of prototype identity changes who may score: tell the screens to refetch.
subscribeAdminIdentity(() => listeners.forEach((l) => l("reset")));

export const mockInterviewsAdapter: InterviewsAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async listInterviews(q) {
    const mode = await previewGate();
    syncBridged();
    const facets: InterviewsPage["facets"] = { stages: configuredStages(), vacancies: VACANCIES.map((v) => ({ id: v.id, name: v.name })), interviewers: INTERVIEWERS };
    if (mode === "empty") {
      return { rows: [], total: 0, tabCounts: { all: 0, "to-schedule": 0, upcoming: 0, "needs-outcome": 0, completed: 0 }, facets, schedulable: [], workspaceEmpty: true };
    }
    const base = items.map((x) => live(x.row)).filter((r) => matches(r, q, false));
    const count = (tab: InterviewsQuery["tab"]) => base.filter((r) => matches(r, { ...q, tab }, true)).length;
    const tabbed = base.filter((r) => matches(r, q, true)).sort((a, b) => (q.sort === "latest" ? cmpIso(a.at, b.at, "desc") : q.sort === "candidate" ? cmpText(a.candidateName, b.candidateName) : cmpIso(a.at, b.at, "asc")));
    return {
      rows: tabbed.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
      total: tabbed.length,
      tabCounts: { all: count("all"), "to-schedule": count("to-schedule"), upcoming: count("upcoming"), "needs-outcome": count("needs-outcome"), completed: count("completed") },
      facets,
      schedulable: items
        .map((x) => live(x.row))
        .filter((r) => r.status === "to-schedule" && textInScope(r.client))
        .map((r) => ({ id: r.id, label: `${r.candidateName}, ${r.stageName} (${r.vacancy})`, defaults: r.defaults })),
      workspaceEmpty: !items.some((x) => textInScope(x.row.client)),
    };
  },

  async getInterview(id) {
    const mode = await previewGate();
    if (mode === "empty") return null;
    syncBridged();
    const it = items.find((x) => x.row.id === id);
    // PROTOTYPE scope guard (same rule as the list). The REAL enforcement is server-side (grant + RLS), including the scorecard.
    if (it && !textInScope(it.row.client)) throw new RestrictedError();
    return it ? detailOf(it) : null;
  },

  async checkConflicts(q) {
    await sleep(150);
    syncBridged();
    const start = new Date(q.at).getTime();
    const end = start + q.durationMins * 60_000;
    const self = items.find((x) => x.row.id === q.interviewId)?.row;
    const out: Conflict[] = [];
    for (const { row: r } of items) {
      if (r.id === q.interviewId || r.status !== "scheduled" || !r.at) continue;
      const s = new Date(r.at).getTime();
      const e = s + r.durationMins * 60_000;
      if (!(start < e && s < end)) continue;
      if (r.interviewer?.id === q.interviewerId) out.push({ interviewId: r.id, who: "interviewer", label: `${r.interviewer.name} already has ${r.candidateName} (${r.stageName})`, at: r.at });
      else if (self && r.applicantId === self.applicantId) out.push({ interviewId: r.id, who: "candidate", label: `${r.candidateName} already has ${r.stageName}`, at: r.at });
    }
    return out;
  },

  async scheduleInterview(id, input) {
    await sleep(350);
    assertLink(input);
    const who = INTERVIEWERS.find((p) => p.id === input.interviewerId);
    if (!who) throw new Error("Unknown interviewer");
    return mutate(id, (it) => ({
      ...it,
      row: { ...it.row, status: "scheduled", at: input.at, durationMins: input.durationMins, interviewer: who, method: input.method, location: input.method === "in-person" ? input.location : null, link: input.method === "video" && input.link.trim() ? input.link.trim() : null },
      history: hist(it, "Interview scheduled", STATUS_LABEL[it.row.status], "Scheduled", null),
    }));
  },

  async rescheduleInterview(id, input) {
    await sleep(350);
    assertLink(input);
    const who = INTERVIEWERS.find((p) => p.id === input.interviewerId);
    if (!who) throw new Error("Unknown interviewer");
    syncBridged();
    const d = mutate(id, (it) => ({
      ...it,
      row: { ...it.row, status: "scheduled", at: input.at, durationMins: input.durationMins, interviewer: who, method: input.method, location: input.method === "in-person" ? input.location : null, link: input.method === "video" && input.link.trim() ? input.link.trim() : null },
      history: hist(it, "Interview rescheduled", STATUS_LABEL[it.row.status], "Scheduled", input.reason ?? null),
    }));
    // The candidate gets the new time and a notification (Applicant mock) when the interview came from their request.
    publishOutcome(id, "rescheduled", {
      scheduledAt: input.at,
      durationMinutes: input.durationMins,
      mode: input.method === "in-person" && input.location.trim() ? `${METHOD_LABEL[input.method]} · ${input.location.trim()}` : METHOD_LABEL[input.method],
      withWhom: `With ${who.name}, Beeliv Recruitment`,
      meetingLink: input.method === "video" && input.link.trim() ? input.link.trim() : undefined,
      reason: input.reason?.trim() || null,
    });
    return d;
  },

  async cancelInterview(id, input) {
    await sleep(350);
    syncBridged();
    const d = mutate(id, (it) => ({ ...it, row: { ...it.row, status: "cancelled" }, history: hist(it, "Interview cancelled", STATUS_LABEL[it.row.status], "Cancelled", input.reason) }));
    publishOutcome(id, "cancelled", { reason: input.reason?.trim() || null });
    return d;
  },

  async saveScorecard(id, input) {
    await sleep(400);
    const cur = items.find((x) => x.row.id === id);
    if (cur && !mayScore(cur.row.vacancy, cur.row.stageId)) throw new Error("Your role may not score this interview");
    return mutate(id, (it) => {
      const had = it.scorecard.submittedAt !== null;
      return {
        ...it,
        scorecard: { ratings: input.ratings, notes: input.notes, recommendation: input.recommendation, submittedAt: new Date().toISOString(), submittedBy: ME },
        row: { ...it.row, status: "completed" },
        history: hist(it, had ? "Scorecard updated" : "Scorecard submitted", had ? null : STATUS_LABEL[it.row.status], RECOMMENDATION_LABEL[input.recommendation], input.notes || null),
      };
    });
  },
};
