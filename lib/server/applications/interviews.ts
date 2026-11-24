/**
 * Recruitment phase 2: interviews (docs/contracts/recruitment-interviews-phase2.sql).
 * Same shape as the phase 1 actions in service.ts: verified actor + session, strict input validation, the shared
 * rate limit, then a service-only database function that re-checks role, client/outlet scope and state.
 * Replies are rebuilt field by field, so nothing the browser should not see can pass through.
 *
 * Until the lead applies the SQL the functions do not exist: PostgREST answers PGRST202 and every action
 * returns `unavailable`, which the screens show as their approved empty state (never an error panel).
 */
import { UUID, plain } from "./validation";
import { admin, applicant, denied, fail, interpret, limited } from "./service";
import {
  INTERVIEW_SCORE_KEYS,
  type AdminInterviewDto,
  type AdminInterviewListDto,
  type ApplicantInterviewDto,
  type ApplicationFailure,
  type ApplicationLifecycle,
  type ApplicationResult,
  type ApplicationsDependencies,
  type InterviewCancelReceiptDto,
  type InterviewMode,
  type InterviewOutcome,
  type InterviewRecommendation,
  type InterviewRecordReceiptDto,
  type InterviewSaveReceiptDto,
  type InterviewScores,
  type InterviewState,
  type RpcReply,
} from "./types";

export const INTERVIEW_LIMITS = { location: 300, interviewer: 120, note: 2000, minMins: 10, maxMins: 480, rangeDays: 92, items: 500 } as const;
const MODES: readonly string[] = ["in_person", "phone", "video"];
const STATES: readonly string[] = ["scheduled", "cancelled", "completed"];
const RECOMMENDATIONS: readonly string[] = ["strongly_recommend", "recommend", "not_recommended"];
const OUTCOMES: readonly string[] = ["passed", "not_passed"];
const LIFECYCLES: readonly string[] = ["submitted", "in_talent_pool", "not_selected", "withdrawn", "completed"];
/** ISO 8601 date-time WITH an explicit offset (Z or +hh:mm). A bare local time is ambiguous and refused. */
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

type Checked<T> = { ok: true; value: T } | { ok: false; code: "invalid_request" | "note_required" };
const bad = { ok: false, code: "invalid_request" } as const;

/* ---------- small validators ---------- */
function onlyKeys(raw: unknown, required: readonly string[], optional: readonly string[] = []): raw is Record<string, unknown> {
  if (!plain(raw)) return false;
  const keys = Object.keys(raw);
  return keys.every((k) => required.includes(k) || optional.includes(k)) && required.every((k) => keys.includes(k));
}
const uuid = (v: unknown): string | null => (typeof v === "string" && UUID.test(v) ? v.toLowerCase() : null);
const revision = (v: unknown): number | null => (Number.isSafeInteger(v) && (v as number) >= 1 && (v as number) <= 1_000_000 ? (v as number) : null);
/** Trimmed text with no control characters (newlines allowed only when `multiline`). `undefined`/`null` -> "". */
function text(v: unknown, max: number, multiline = false): string | null {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string" || v.length > max * 2) return null;
  const clean = v.trim();
  if (clean.length > max || CONTROL.test(clean) || (!multiline && /[\r\n]/.test(clean))) return null;
  return clean;
}
function isDay(v: unknown): v is string {
  if (typeof v !== "string" || !DAY.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
const dayDiff = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/* ---------- commands ---------- */
export type InterviewListCommand = { from: string | null; to: string | null; applicationId: string | null };
export type InterviewSaveCommand = { applicationId: string; interviewId: string | null; expectedRevision: number | null; startsAt: string; durationMins: number; mode: InterviewMode; location: string; interviewerName: string; note: string | null };
export type InterviewCancelCommand = { interviewId: string; expectedRevision: number; note: string };
export type InterviewRecordCommand = { interviewId: string; expectedRevision: number; scores: InterviewScores; recommendation: InterviewRecommendation; outcome: InterviewOutcome; note: string | null };

/** Either one application (all its interviews) or a Lagos date range of at most 92 days. */
export function validateInterviewList(raw: unknown): Checked<InterviewListCommand> {
  if (!onlyKeys(raw, [], ["from", "to", "applicationId"])) return bad;
  if (raw.applicationId !== undefined) {
    const applicationId = uuid(raw.applicationId);
    if (!applicationId || raw.from !== undefined || raw.to !== undefined) return bad;
    return { ok: true, value: { from: null, to: null, applicationId } };
  }
  if (!isDay(raw.from) || !isDay(raw.to)) return bad;
  const span = dayDiff(raw.from, raw.to);
  if (span < 0 || span > INTERVIEW_LIMITS.rangeDays) return bad;
  return { ok: true, value: { from: raw.from, to: raw.to, applicationId: null } };
}

/** Schedule (no interviewId) or reschedule (interviewId + expectedRevision). */
export function validateInterviewSave(raw: unknown, now = Date.now()): Checked<InterviewSaveCommand> {
  if (!onlyKeys(raw, ["applicationId", "startsAt", "durationMins", "mode"], ["interviewId", "expectedRevision", "location", "interviewerName", "note"])) return bad;
  const applicationId = uuid(raw.applicationId);
  const resched = raw.interviewId !== undefined || raw.expectedRevision !== undefined;
  const interviewId = resched ? uuid(raw.interviewId) : null;
  const expectedRevision = resched ? revision(raw.expectedRevision) : null;
  if (!applicationId || (resched && (!interviewId || expectedRevision === null))) return bad;
  if (typeof raw.startsAt !== "string" || !ISO_WITH_OFFSET.test(raw.startsAt)) return bad;
  const at = Date.parse(raw.startsAt);
  // Same window as the database: not more than a day in the past, not more than a year ahead.
  if (!Number.isFinite(at) || at < now - 86_400_000 || at > now + 365 * 86_400_000) return bad;
  const durationMins = raw.durationMins;
  if (!Number.isSafeInteger(durationMins) || (durationMins as number) < INTERVIEW_LIMITS.minMins || (durationMins as number) > INTERVIEW_LIMITS.maxMins) return bad;
  if (typeof raw.mode !== "string" || !MODES.includes(raw.mode)) return bad;
  const mode = raw.mode as InterviewMode;
  const location = text(raw.location, INTERVIEW_LIMITS.location);
  const interviewerName = text(raw.interviewerName, INTERVIEW_LIMITS.interviewer);
  const note = text(raw.note, INTERVIEW_LIMITS.note, true);
  if (location === null || interviewerName === null || note === null) return bad;
  // A video interview's place is its meeting link: https only, so the applicant's Join button can never run script.
  if (mode === "video" && location && !/^https:\/\/\S+$/i.test(location)) return bad;
  return { ok: true, value: { applicationId, interviewId, expectedRevision, startsAt: new Date(at).toISOString(), durationMins: durationMins as number, mode, location, interviewerName, note: note || null } };
}

export function validateInterviewCancel(raw: unknown): Checked<InterviewCancelCommand> {
  if (!onlyKeys(raw, ["interviewId", "expectedRevision"], ["note"])) return bad;
  const interviewId = uuid(raw.interviewId), expectedRevision = revision(raw.expectedRevision);
  const note = text(raw.note, INTERVIEW_LIMITS.note, true);
  if (!interviewId || expectedRevision === null || note === null) return bad;
  if (!note) return { ok: false, code: "note_required" };
  return { ok: true, value: { interviewId, expectedRevision, note } };
}

/** Exactly the six score points, each a whole number 1..5. */
export function validateScores(raw: unknown): InterviewScores | null {
  if (!plain(raw)) return null;
  const keys = Object.keys(raw);
  if (keys.length !== INTERVIEW_SCORE_KEYS.length || !INTERVIEW_SCORE_KEYS.every((k) => keys.includes(k))) return null;
  const out = {} as InterviewScores;
  for (const k of INTERVIEW_SCORE_KEYS) {
    const v = raw[k];
    if (!Number.isInteger(v) || (v as number) < 1 || (v as number) > 5) return null;
    out[k] = v as number;
  }
  return out;
}

export function validateInterviewRecord(raw: unknown): Checked<InterviewRecordCommand> {
  if (!onlyKeys(raw, ["interviewId", "expectedRevision", "scores", "recommendation", "outcome"], ["note"])) return bad;
  const interviewId = uuid(raw.interviewId), expectedRevision = revision(raw.expectedRevision);
  const scores = validateScores(raw.scores);
  const note = text(raw.note, INTERVIEW_LIMITS.note, true);
  if (!interviewId || expectedRevision === null || !scores || note === null) return bad;
  if (typeof raw.recommendation !== "string" || !RECOMMENDATIONS.includes(raw.recommendation)) return bad;
  if (typeof raw.outcome !== "string" || !OUTCOMES.includes(raw.outcome)) return bad;
  if (raw.outcome === "not_passed" && !note) return { ok: false, code: "note_required" };
  return { ok: true, value: { interviewId, expectedRevision, scores, recommendation: raw.recommendation as InterviewRecommendation, outcome: raw.outcome as InterviewOutcome, note: note || null } };
}

/* ---------- reply projection ---------- */
const id = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const int = (v: unknown, min: number, max: number): v is number => Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max;
const when = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
const oneOf = <T extends string>(v: unknown, list: readonly string[]): v is T => typeof v === "string" && list.includes(v);

export function projectAdminInterview(v: unknown): AdminInterviewDto | null {
  if (!plain(v) || !id(v.id) || !int(v.revision, 1, 1_000_000) || !oneOf<InterviewState>(v.state, STATES) || !when(v.startsAt)
    || !int(v.durationMins, INTERVIEW_LIMITS.minMins, INTERVIEW_LIMITS.maxMins) || !oneOf<InterviewMode>(v.mode, MODES)
    || !str(v.location, INTERVIEW_LIMITS.location) || !str(v.interviewerName, INTERVIEW_LIMITS.interviewer) || !when(v.updatedAt)
    || !id(v.applicationId) || !int(v.applicationRevision, 1, 1_000_000) || !str(v.applicantName, 200) || !id(v.vacancyId)
    || !str(v.vacancyTitle, 200) || !(v.clientName === null || str(v.clientName, 200)) || !(v.outletName === null || v.outletName === undefined || str(v.outletName, 200))
    || !(v.note === null || str(v.note, INTERVIEW_LIMITS.note))) return null;
  const scores = v.scores === null ? null : validateScores(v.scores);
  if (v.scores !== null && !scores) return null;
  if (!(v.recommendation === null || oneOf(v.recommendation, RECOMMENDATIONS)) || !(v.outcome === null || oneOf(v.outcome, OUTCOMES))) return null;
  return {
    id: v.id, revision: v.revision, state: v.state, startsAt: v.startsAt, durationMins: v.durationMins, mode: v.mode, location: v.location,
    interviewerName: v.interviewerName, scores, recommendation: (v.recommendation as InterviewRecommendation | null), outcome: (v.outcome as InterviewOutcome | null),
    note: v.note as string | null, updatedAt: v.updatedAt, applicationId: v.applicationId, applicationRevision: v.applicationRevision, applicantName: v.applicantName,
    vacancyId: v.vacancyId, vacancyTitle: v.vacancyTitle, clientName: (v.clientName as string | null) ?? "", outletName: (v.outletName as string | null | undefined) ?? null,
  };
}

/** Rebuilt from five safe fields only: nothing about scores, notes, recommendation or the interviewer can reach the applicant. */
export function projectApplicantInterview(v: unknown): ApplicantInterviewDto | null {
  if (!plain(v) || !id(v.id) || !id(v.applicationId) || !(v.role === null || str(v.role, 200)) || !(v.company === null || str(v.company, 200)) || !when(v.startsAt)
    || !int(v.durationMins, INTERVIEW_LIMITS.minMins, INTERVIEW_LIMITS.maxMins) || !oneOf<InterviewMode>(v.mode, MODES)
    || !str(v.location, INTERVIEW_LIMITS.location) || !oneOf<InterviewState>(v.state, STATES)) return null;
  // Defence in depth: a video "place" that is not an https link is not shown as a link.
  const location = v.mode === "video" && v.location && !/^https:\/\/\S+$/i.test(v.location) ? "" : v.location;
  return { id: v.id, applicationId: v.applicationId, role: (v.role as string | null) ?? "", company: (v.company as string | null) ?? "", startsAt: v.startsAt, durationMins: v.durationMins, mode: v.mode, location, state: v.state };
}

function projectList<T>(v: unknown, item: (x: unknown) => T | null): T[] | null {
  if (!Array.isArray(v) || v.length > INTERVIEW_LIMITS.items) return null;
  const out: T[] = [];
  for (const entry of v) {
    const parsed = item(entry);
    if (parsed === null) return null;
    out.push(parsed);
  }
  return out;
}

/* ---------- transport ---------- */
/** The database function is not there yet (contract not applied): PostgREST PGRST202 / Postgres 42883. */
export function functionMissing(reply: RpcReply | undefined): boolean {
  const e = reply?.error;
  if (!e || typeof e !== "object") return false;
  const code = (e as { code?: unknown }).code;
  return code === "PGRST202" || code === "42883";
}

async function run<T>(mutation: boolean, requestId: string, call: () => PromiseLike<RpcReply>, build: (d: Record<string, unknown>) => T | null): Promise<ApplicationResult<{ value: T }>> {
  let reply: RpcReply | undefined;
  try { reply = await call(); } catch { return mutation ? fail("outcome_unknown", { requestId }) : fail("unavailable"); }
  if (functionMissing(reply)) return fail("unavailable");
  const got = interpret(reply);
  if (denied(got)) return got;
  const value = got ? build(got.data) : null;
  if (value !== null) return { ok: true, value };
  return mutation ? fail("outcome_unknown", { requestId }) : fail("unavailable");
}

const invalid = (c: Checked<unknown>): ApplicationFailure => fail(c.ok ? "invalid_request" : c.code);

/* ---------- actions ---------- */
export async function adminListInterviews(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: AdminInterviewListDto }>> {
  const who = await admin(deps); if ("ok" in who) return who;
  const q = validateInterviewList(raw); if (!q.ok) return invalid(q);
  const limit = await limited(deps, who.uid); if (limit) return limit;
  return run(false, "", () => deps.gateway.interviewAdminList({ actorUid: who.uid, sessionId: who.sessionId, ...q.value }), (d) => {
    if (typeof d.canManage !== "boolean") return null;
    const items = projectList(d.items, projectAdminInterview);
    if (!items) return null;
    // Bind the reply to what was asked: another application's interviews mean a bad reply.
    if (q.value.applicationId && items.some((i) => i.applicationId !== q.value.applicationId)) return null;
    return { canManage: d.canManage, items };
  });
}

export async function adminSaveInterview(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: InterviewSaveReceiptDto }>> {
  const who = await admin(deps); if ("ok" in who) return who;
  const c = validateInterviewSave(raw); if (!c.ok) return invalid(c);
  const limit = await limited(deps, who.uid); if (limit) return limit;
  const v = c.value;
  return run(true, v.interviewId ?? v.applicationId, () => deps.gateway.interviewAdminSave({ actorUid: who.uid, sessionId: who.sessionId, ...v }), (d) => {
    if (!id(d.interviewId) || !int(d.revision, 1, 1_000_000) || !int(d.applicationRevision, 1, 1_000_000)) return null;
    if (v.interviewId ? d.interviewId.toLowerCase() !== v.interviewId || d.revision !== (v.expectedRevision as number) + 1 : d.revision !== 1) return null;
    return { interviewId: d.interviewId, revision: d.revision, applicationRevision: d.applicationRevision };
  });
}

export async function adminCancelInterview(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: InterviewCancelReceiptDto }>> {
  const who = await admin(deps); if ("ok" in who) return who;
  const c = validateInterviewCancel(raw); if (!c.ok) return invalid(c);
  const limit = await limited(deps, who.uid); if (limit) return limit;
  const v = c.value;
  return run(true, v.interviewId, () => deps.gateway.interviewAdminCancel({ actorUid: who.uid, sessionId: who.sessionId, ...v }), (d) =>
    d.revision === v.expectedRevision + 1 ? { interviewId: v.interviewId, revision: d.revision as number } : null);
}

export async function adminRecordInterview(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: InterviewRecordReceiptDto }>> {
  const who = await admin(deps); if ("ok" in who) return who;
  const c = validateInterviewRecord(raw); if (!c.ok) return invalid(c);
  const limit = await limited(deps, who.uid); if (limit) return limit;
  const v = c.value;
  return run(true, v.interviewId, () => deps.gateway.interviewAdminRecord({ actorUid: who.uid, sessionId: who.sessionId, ...v }), (d) =>
    d.revision === v.expectedRevision + 1 && int(d.applicationRevision, 1, 1_000_000) && oneOf<ApplicationLifecycle>(d.lifecycle, LIFECYCLES) && int(d.stage, 0, 7)
      ? { interviewId: v.interviewId, revision: d.revision, applicationRevision: d.applicationRevision, lifecycle: d.lifecycle, stage: d.stage } : null);
}

export async function applicantListInterviews(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: { items: ApplicantInterviewDto[] } }>> {
  const who = await applicant(deps); if ("ok" in who) return who;
  if (!onlyKeys(raw, [])) return fail("invalid_request");
  const limit = await limited(deps, who.uid); if (limit) return limit;
  return run(false, "", () => deps.gateway.interviewApplicantList({ actorUid: who.uid, sessionId: who.sessionId }), (d) => {
    const items = projectList(d.items, projectApplicantInterview);
    return items ? { items } : null;
  });
}
