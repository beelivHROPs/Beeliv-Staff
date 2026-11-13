/**
 * Applications service. Pure: every effect goes through the injected dependencies, so it
 * is testable offline. It never trusts browser ownership; the database re-resolves the actor.
 */
import { UUID, plain, validateId, validateOpen, validatePage, validateSave, validateSubmit } from "./validation";
import { projectAdminDetail, projectAdminRow, projectApplicantApplication, projectDraft, projectPage } from "./project";
import type {
  AdminApplicationDetailDto, AdminApplicationRowDto, AdminIdentity, ApplicantApplicationDto, ApplicantIdentity, ApplicationErrorCode, ApplicationFailure,
  ApplicationResult, ApplicationsDependencies, OpenDraftDto, Page, RpcReply, SaveReceiptDto, SubmitReceiptDto,
} from "./types";

/** Database reason -> safe public code. Anything unknown becomes `unavailable`; text is never forwarded. */
const REASONS: Readonly<Record<string, ApplicationErrorCode>> = {
  no_access: "forbidden", invalid_request: "invalid_request", conflict: "conflict", stale: "stale", closed: "closed",
  rate_limited: "rate_limited", documents_missing: "documents_missing", documents_unsupported: "documents_unsupported",
  test_unavailable: "test_unavailable", screening_incomplete: "screening_incomplete", unavailable: "unavailable",
};
const id = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const fail = (code: ApplicationErrorCode, extra: Partial<ApplicationFailure> = {}): ApplicationFailure => ({ ok: false, code, ...extra });

async function applicant(deps: ApplicationsDependencies): Promise<ApplicantIdentity | ApplicationFailure> {
  if (!deps.enabled) return fail("unavailable");
  let who: ApplicantIdentity | null;
  try { who = await deps.verifyApplicant(); } catch { return fail("unavailable"); }
  if (!who || !who.emailVerified || ![who.uid, who.personId, who.sessionId].every((x) => typeof x === "string" && UUID.test(x))) return fail("unauthenticated");
  // Mixed Applicant+Staff stays allowed; Staff-only or other apps do not.
  if (who.app !== "talent" || who.status !== "active" || !Array.isArray(who.entitlements) || !who.entitlements.includes("applicant")) return fail("forbidden");
  return who;
}
async function admin(deps: ApplicationsDependencies): Promise<AdminIdentity | ApplicationFailure> {
  if (!deps.enabled || !deps.adminReadsEnabled) return fail("unavailable");
  let who: AdminIdentity | null;
  try { who = await deps.verifyAdmin(); } catch { return fail("unavailable"); }
  if (!who || !who.emailVerified || !UUID.test(who.uid) || !UUID.test(who.sessionId)) return fail("unauthenticated");
  if (who.aal !== "aal2") return fail("forbidden");
  return who;
}
async function limited(deps: ApplicationsDependencies, uid: string): Promise<ApplicationFailure | null> {
  try { await deps.consumeLimit(uid); return null; } catch (error) {
    return plain(error) && error.code === "rate_limited" ? fail("rate_limited") : fail("unavailable");
  }
}
function fingerprint(deps: ApplicationsDependencies, op: "open" | "save" | "submit", command: unknown): string | null {
  try { const f = deps.fingerprint(op, command); return /^[a-f0-9]{64}$/.test(f) ? f : null; } catch { return null; }
}
/** Returns the reply record, a definite denial, or null when the outcome cannot be trusted. */
function interpret(reply: RpcReply | undefined): { data: Record<string, unknown> } | ApplicationFailure | null {
  if (!reply || reply.error || !plain(reply.data)) return null;
  if (reply.data.ok === false) return fail(typeof reply.data.reason === "string" && REASONS[reply.data.reason] ? REASONS[reply.data.reason] : "unavailable");
  return reply.data.ok === true ? { data: reply.data } : null;
}
const denied = (x: { data: Record<string, unknown> } | ApplicationFailure | null): x is ApplicationFailure => !!x && "ok" in x && x.ok === false;

/** Run a mutation. An untrustworthy/absent reply is `outcome_unknown` with the original requestId. */
async function mutate<T>(requestId: string, call: () => PromiseLike<RpcReply>, build: (d: Record<string, unknown>) => T | null): Promise<ApplicationResult<{ value: T }>> {
  let reply: RpcReply | undefined;
  try { reply = await call(); } catch { return fail("outcome_unknown", { requestId }); }
  const got = interpret(reply);
  if (denied(got)) return got;
  const value = got ? build(got.data) : null;
  return value === null ? fail("outcome_unknown", { requestId }) : { ok: true, value };
}
async function read<T>(call: () => PromiseLike<RpcReply>, build: (d: Record<string, unknown>) => T | null): Promise<ApplicationResult<{ value: T }>> {
  let reply: RpcReply | undefined;
  try { reply = await call(); } catch { return fail("unavailable"); }
  const got = interpret(reply);
  if (denied(got)) return got;
  const value = got ? build(got.data) : null;
  return value === null ? fail("unavailable") : { ok: true, value };
}

export async function openDraft(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: OpenDraftDto }>> {
  const who = await applicant(deps); if ("ok" in who) return who;
  const cmd = validateOpen(raw); if (!cmd.ok) return fail("invalid_request", { fields: cmd.fields });
  const fp = fingerprint(deps, "open", cmd.value); if (!fp) return fail("unavailable");
  const limit = await limited(deps, who.uid); if (limit) return limit;
  return mutate(cmd.value.requestId, () => deps.gateway.open({ actorUid: who.uid, sessionId: who.sessionId, ...cmd.value, fingerprint: fp }), (d) => {
    if (typeof d.replayed !== "boolean") return null;
    if (d.state === "submitted") return id(d.applicationId) ? { state: "submitted" as const, applicationId: d.applicationId, replayed: d.replayed } : null;
    const draft = d.state === "open" ? projectDraft(d.draft) : null;
    // Bind the reply to what was asked: a wrong vacancy means a bad reply, never success.
    return draft && draft.vacancyId === cmd.value.vacancyId ? { state: "open" as const, draft, replayed: d.replayed } : null;
  });
}

export async function getDraft(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: OpenDraftDto }>> {
  const who = await applicant(deps); if ("ok" in who) return who;
  const cmd = validateId(raw); if (!cmd.ok) return fail("invalid_request", { fields: cmd.fields });
  const limit = await limited(deps, who.uid); if (limit) return limit;
  return read(() => deps.gateway.get({ actorUid: who.uid, sessionId: who.sessionId, applicationId: cmd.value.applicationId }), (d) => {
    const draft = projectDraft(d.draft);
    return draft && draft.applicationId === cmd.value.applicationId ? { state: "open" as const, draft, replayed: false } : null;
  });
}

export async function saveDraft(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: SaveReceiptDto }>> {
  const who = await applicant(deps); if ("ok" in who) return who;
  const cmd = validateSave(raw); if (!cmd.ok) return fail("invalid_request", { fields: cmd.fields });
  const fp = fingerprint(deps, "save", cmd.value); if (!fp) return fail("unavailable");
  const limit = await limited(deps, who.uid); if (limit) return limit;
  const c = cmd.value;
  return mutate(c.requestId, () => deps.gateway.save({ actorUid: who.uid, sessionId: who.sessionId, ...c, fingerprint: fp }), (d) => {
    if (d.applicationId !== c.applicationId || !Number.isSafeInteger(d.revision) || typeof d.replayed !== "boolean") return null;
    const revision = d.revision as number;
    // A fresh save is exactly one revision ahead; a replay may be older.
    if (d.replayed ? revision < c.expectedRevision + 1 : revision !== c.expectedRevision + 1) return null;
    return { applicationId: c.applicationId, revision, replayed: d.replayed };
  });
}

export async function submitApplication(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: SubmitReceiptDto }>> {
  const who = await applicant(deps); if ("ok" in who) return who;
  const cmd = validateSubmit(raw); if (!cmd.ok) return fail("invalid_request", { fields: cmd.fields });
  const fp = fingerprint(deps, "submit", cmd.value); if (!fp) return fail("unavailable");
  const limit = await limited(deps, who.uid); if (limit) return limit;
  const c = cmd.value;
  return mutate(c.requestId, () => deps.gateway.submit({ actorUid: who.uid, sessionId: who.sessionId, ...c, fingerprint: fp }), (d) => {
    if (d.applicationId !== c.applicationId || typeof d.submittedAt !== "string" || !Number.isFinite(Date.parse(d.submittedAt))
      || !Number.isSafeInteger(d.revision) || typeof d.replayed !== "boolean") return null;
    // Only the receipt leaves the module: no form, documents, or stage.
    return { applicationId: c.applicationId, submittedAt: d.submittedAt, revision: d.revision as number, replayed: d.replayed };
  });
}

export async function listMyApplications(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: Page<ApplicantApplicationDto> }>> {
  const who = await applicant(deps); if ("ok" in who) return who;
  const q = validatePage(raw, false); if (!q.ok) return fail("invalid_request", { fields: q.fields });
  const limit = await limited(deps, who.uid); if (limit) return limit;
  return read(() => deps.gateway.listMine({ actorUid: who.uid, sessionId: who.sessionId, page: q.value.page, pageSize: q.value.pageSize }),
    (d) => projectPage(d, projectApplicantApplication, q.value.pageSize, q.value.page));
}

export async function getMyApplication(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: ApplicantApplicationDto }>> {
  const who = await applicant(deps); if ("ok" in who) return who;
  const cmd = validateId(raw); if (!cmd.ok) return fail("invalid_request", { fields: cmd.fields });
  const limit = await limited(deps, who.uid); if (limit) return limit;
  return read(() => deps.gateway.readMine({ actorUid: who.uid, sessionId: who.sessionId, applicationId: cmd.value.applicationId }), (d) => {
    const item = projectApplicantApplication(d.item);
    return item && item.applicationId === cmd.value.applicationId ? item : null;
  });
}

export async function adminListApplications(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: Page<AdminApplicationRowDto> }>> {
  const who = await admin(deps); if ("ok" in who) return who;
  const q = validatePage(raw, true); if (!q.ok) return fail("invalid_request", { fields: q.fields });
  const limit = await limited(deps, who.uid); if (limit) return limit;
  return read(() => deps.gateway.adminList({ actorUid: who.uid, sessionId: who.sessionId, query: q.value }),
    (d) => projectPage(d, projectAdminRow, q.value.pageSize, q.value.page));
}

export async function adminReadApplication(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: AdminApplicationDetailDto }>> {
  const who = await admin(deps); if ("ok" in who) return who;
  const cmd = validateId(raw); if (!cmd.ok) return fail("invalid_request", { fields: cmd.fields });
  const limit = await limited(deps, who.uid); if (limit) return limit;
  return read(() => deps.gateway.adminRead({ actorUid: who.uid, sessionId: who.sessionId, applicationId: cmd.value.applicationId }), (d) => {
    const item = projectAdminDetail(d.item);
    return item && item.applicationId === cmd.value.applicationId ? item : null;
  });
}
