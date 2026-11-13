/**
 * Staff documentation service. Pure: every effect goes through the injected dependencies, so it is testable offline.
 * Own actions: the owner is ALWAYS the verified session (deps.verifyStaff); no body can name a person.
 * HR actions: Admin session with AAL2; scope and capability are decided by the database, never here.
 * Client action: STATUS only.
 */
import {
  isId, projectChecklist, projectClientCompletion, projectHrCompletion, projectQueue, projectUploadStatus,
} from "./project";
import {
  plain, validateComplete, validateCompletion, validateDecide, validateEmpty, validateOpen, validateQueue, validateSlotRequest, validateStatus, type Checked,
} from "./validation";
import type {
  AdminIdentity, ClientCompletionDto, ClientIdentity, DecisionReceiptDto, DocErrorCode, DocFailure, DocResult, HrCompletionDto, HrQueueDto, OpenGrant, OwnChecklistDto,
  RpcReply, StaffDocDependencies, StaffDocOperation, StaffIdentity, UploadGrant, UploadStatusDto,
} from "./types";

/** Database reason -> safe public code. Anything unknown becomes `unavailable`; database text is never forwarded. */
const REASONS: Readonly<Record<string, DocErrorCode>> = {
  no_access: "forbidden", not_found: "not_found", invalid_request: "invalid_request", conflict: "conflict", stale: "stale", rate_limited: "rate_limited",
  expired: "expired", limit_reached: "limit_reached", unavailable: "unavailable",
};
const fail = (code: DocErrorCode, extra: Partial<DocFailure> = {}): DocFailure => ({ ok: false, code, ...extra });
type Value<T> = Promise<DocResult<{ value: T }>>;
const QUARANTINE = "staff-document-quarantine", CLEAN = "staff-document-clean";
const KEY = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\/source\.(pdf|jpg|jpeg|png)$/;
const MEDIA = ["application/pdf", "image/jpeg", "image/png"];

function checked<T>(c: Checked<T>): { value: T } | DocFailure {
  return c.ok ? { value: c.value } : fail("invalid_request", { fields: c.fields });
}
const bad = (x: unknown): x is DocFailure => plain(x) && x.ok === false;

async function staff(deps: StaffDocDependencies, mode: "read" | "write" | "upload"): Promise<StaffIdentity | DocFailure> {
  if (!deps.enabled || (mode !== "read" && !deps.writesEnabled) || (mode === "upload" && !deps.storageEnabled)) return fail("unavailable");
  let who: StaffIdentity | null;
  try { who = await deps.verifyStaff(); } catch { return fail("unavailable"); }
  if (!who || !who.emailVerified || !isId(who.uid) || !isId(who.personId) || !isId(who.sessionId)) return fail("unauthenticated");
  return who;
}
async function admin(deps: StaffDocDependencies, mode: "read" | "write" | "open"): Promise<AdminIdentity | DocFailure> {
  if (!deps.enabled || (mode !== "read" && !deps.writesEnabled) || (mode === "open" && !deps.storageEnabled)) return fail("unavailable");
  let who: AdminIdentity | null;
  try { who = await deps.verifyAdmin(); } catch { return fail("unavailable"); }
  if (!who || !who.emailVerified || !isId(who.uid) || !isId(who.sessionId)) return fail("unauthenticated");
  if (who.aal !== "aal2") return fail("forbidden"); // the database verifies the real session level again
  return who;
}
async function client(deps: StaffDocDependencies): Promise<ClientIdentity | DocFailure> {
  if (!deps.enabled) return fail("unavailable");
  let who: ClientIdentity | null;
  try { who = await deps.verifyClient(); } catch { return fail("unavailable"); }
  if (!who || !who.emailVerified || !isId(who.uid) || !isId(who.sessionId)) return fail("unauthenticated");
  return who;
}
async function limited(deps: StaffDocDependencies, uid: string): Promise<DocFailure | null> {
  try { await deps.consumeLimit(uid); return null; } catch (error) {
    return plain(error) && error.code === "rate_limited" ? fail("rate_limited") : fail("unavailable");
  }
}
function fingerprint(deps: StaffDocDependencies, op: StaffDocOperation, command: unknown): string | null {
  try { const f = deps.fingerprint(op, command); return /^[a-f0-9]{64}$/.test(f) ? f : null; } catch { return null; }
}
/** The reply record, a definite denial, or null when the outcome cannot be trusted. */
function interpret(reply: RpcReply | undefined): Record<string, unknown> | DocFailure | null {
  if (!reply || reply.error || !plain(reply.data)) return null;
  if (reply.data.ok === false) return fail(typeof reply.data.reason === "string" && REASONS[reply.data.reason] ? REASONS[reply.data.reason] : "unavailable");
  return reply.data.ok === true ? reply.data : null;
}
async function read<T>(call: () => PromiseLike<RpcReply>, build: (d: Record<string, unknown>) => T | null): Value<T> {
  let reply: RpcReply | undefined;
  try { reply = await call(); } catch { return fail("unavailable"); }
  const got = interpret(reply);
  if (bad(got)) return got;
  const value = got ? build(got) : null;
  return value === null ? fail("unavailable") : { ok: true, value };
}
/** A mutation whose reply cannot be trusted is `outcome_unknown` with the original requestId (the caller reconciles, never repeats blindly). */
async function mutate<T>(requestId: string, call: () => PromiseLike<RpcReply>, build: (d: Record<string, unknown>) => T | null): Value<T> {
  let reply: RpcReply | undefined;
  try { reply = await call(); } catch { return fail("outcome_unknown", { requestId }); }
  const got = interpret(reply);
  if (bad(got)) return got.code === "unavailable" ? fail("unavailable", { requestId }) : got;
  const value = got ? build(got) : null;
  return value === null ? fail("outcome_unknown", { requestId }) : { ok: true, value };
}
const time = (v: unknown): number => (typeof v === "string" ? Date.parse(v) : NaN);

/* ------------------------------------- own (Staff) ------------------------------------- */

export async function getChecklist(raw: unknown, deps: StaffDocDependencies): Value<OwnChecklistDto> {
  const c = checked(validateEmpty(raw)); if (bad(c)) return c;
  const who = await staff(deps, "read"); if (bad(who)) return who;
  const q = await limited(deps, who.uid); if (q) return q;
  return read(() => deps.gateway.checklist({ actorUid: who.uid, sessionId: who.sessionId }), projectChecklist);
}

export async function getUploadStatus(raw: unknown, deps: StaffDocDependencies): Value<UploadStatusDto> {
  const c = checked(validateStatus(raw)); if (bad(c)) return c;
  const who = await staff(deps, "read"); if (bad(who)) return who;
  const q = await limited(deps, who.uid); if (q) return q;
  return read(() => deps.gateway.uploadStatus({ actorUid: who.uid, sessionId: who.sessionId, uploadId: c.value.uploadId }), (d) => projectUploadStatus(d, c.value.uploadId));
}

/** Reserve an upload for one slot of the signed-in person and sign a QUARANTINE upload. Nothing is verified or published here. */
export async function requestSlotUpload(raw: unknown, deps: StaffDocDependencies): Value<UploadGrant> {
  const c = checked(validateSlotRequest(raw)); if (bad(c)) return c;
  const cmd = c.value;
  const who = await staff(deps, "upload"); if (bad(who)) return who;
  let origin: URL;
  try { origin = new URL(deps.storageOrigin); } catch { return fail("unavailable"); }
  if (origin.origin !== deps.storageOrigin || origin.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(origin.hostname)) return fail("unavailable");
  const fp = fingerprint(deps, "slot-request", cmd); if (!fp) return fail("unavailable");
  const q = await limited(deps, who.uid); if (q) return q;
  let reply: RpcReply | undefined;
  try { reply = await deps.gateway.requestSlot({ actorUid: who.uid, sessionId: who.sessionId, ...cmd, fingerprint: fp }); } catch { return fail("outcome_unknown", { requestId: cmd.requestId }); }
  const got = interpret(reply);
  if (bad(got)) return got.code === "unavailable" ? fail("unavailable", { requestId: cmd.requestId }) : got;
  const unknown = fail("outcome_unknown", { requestId: cmd.requestId });
  if (!got) return unknown;
  let now: number;
  try { now = deps.now().getTime(); } catch { return unknown; }
  const deadline = time(got.completeBefore), uploadId = got.uploadId;
  const ext = cmd.fileName.slice(cmd.fileName.lastIndexOf(".")).toLowerCase();
  // Exact binding: a malformed reply cannot mint access for another person, slot or object. The owner is the SESSION person.
  if (!isId(uploadId) || got.ownerId !== who.personId || got.requestId !== cmd.requestId || got.fingerprint !== fp || got.purpose !== cmd.slot || got.size !== cmd.size
    || got.contentType !== cmd.contentType || got.state !== "reserved" || got.bucket !== QUARANTINE || got.objectKey !== `${uploadId.toLowerCase()}/source${ext}`
    || typeof got.replayed !== "boolean" || !Number.isFinite(now) || !Number.isFinite(deadline) || deadline > now + 605_000) return unknown;
  if (deadline <= now) return fail("expired");
  let signed: { url: string; expiresAt: string };
  try { signed = await deps.storage.signUpload({ bucket: QUARANTINE, objectKey: got.objectKey as string, upsert: false }); } catch { return fail("unavailable", { requestId: cmd.requestId }); }
  try {
    const url = new URL(signed.url), expires = time(signed.expiresAt), after = deps.now().getTime(), token = url.searchParams.get("token");
    if (!Number.isFinite(after) || after >= deadline) return fail("expired");
    if (url.origin !== deps.storageOrigin || url.username || url.password || url.hash || url.pathname !== `/storage/v1/object/upload/sign/${QUARANTINE}/${got.objectKey as string}`
      || !token || token.length > 8192 || [...url.searchParams.keys()].length !== 1 || !Number.isFinite(expires) || expires < deadline || expires > after + 7_260_000) {
      return fail("unavailable", { requestId: cmd.requestId });
    }
    return { ok: true, value: { uploadId: uploadId.toLowerCase(), status: "awaiting-bytes", uploadUrl: url.toString(), uploadUrlExpiresAt: new Date(expires).toISOString(), completeBefore: new Date(deadline).toISOString(), replayed: got.replayed } };
  } catch { return fail("unavailable", { requestId: cmd.requestId }); }
}

/** Queue verification only. The client never says what the stored bytes are. */
export async function completeUpload(raw: unknown, deps: StaffDocDependencies): Value<{ uploadId: string; status: "checking"; replayed: boolean }> {
  const c = checked(validateComplete(raw)); if (bad(c)) return c;
  const who = await staff(deps, "upload"); if (bad(who)) return who;
  const q = await limited(deps, who.uid); if (q) return q;
  const { requestId, uploadId } = c.value;
  return mutate(requestId, () => deps.gateway.complete({ actorUid: who.uid, sessionId: who.sessionId, requestId, uploadId }), (d) =>
    d.uploadId === uploadId && d.requestId === requestId && d.ownerId === who.personId && d.status === "checking" && typeof d.replayed === "boolean"
      ? { uploadId, status: "checking" as const, replayed: d.replayed } : null);
}

/* ------------------------------------- HR (Admin) ------------------------------------- */

export async function hrQueue(raw: unknown, deps: StaffDocDependencies): Value<HrQueueDto> {
  const c = checked(validateQueue(raw)); if (bad(c)) return c;
  const who = await admin(deps, "read"); if (bad(who)) return who;
  const q = await limited(deps, who.uid); if (q) return q;
  return read(() => deps.gateway.hrQueue({ actorUid: who.uid, sessionId: who.sessionId, query: c.value }), (d) => projectQueue(d, c.value.pageSize));
}

/** Authorize + audit in the database, then ask the storage layer for a short-lived read grant. The grant is not a DTO. */
export async function hrOpen(raw: unknown, deps: StaffDocDependencies): Value<OpenGrant> {
  const c = checked(validateOpen(raw)); if (bad(c)) return c;
  const who = await admin(deps, "open"); if (bad(who)) return who;
  const q = await limited(deps, who.uid); if (q) return q;
  let reply: RpcReply | undefined;
  try { reply = await deps.gateway.hrOpen({ actorUid: who.uid, sessionId: who.sessionId, versionId: c.value.versionId, reason: c.value.reason }); } catch { return fail("unavailable"); }
  const got = interpret(reply);
  if (bad(got)) return got;
  if (!got || got.versionId !== c.value.versionId || got.bucket !== CLEAN || typeof got.objectKey !== "string" || !KEY.test(got.objectKey)
    || typeof got.mediaType !== "string" || !MEDIA.includes(got.mediaType) || !Number.isSafeInteger(got.sizeBytes) || (got.sizeBytes as number) < 1 || (got.sizeBytes as number) > 5_000_000) return fail("unavailable");
  try {
    const signed = await deps.storage.signRead({ bucket: CLEAN, objectKey: got.objectKey, expiresInSeconds: 60 });
    const url = new URL(signed.url), expires = time(signed.expiresAt), now = deps.now().getTime();
    if (url.origin !== deps.storageOrigin || url.protocol !== "https:" || url.username || url.password || !Number.isFinite(expires) || expires <= now || expires > now + 120_000) return fail("unavailable");
    return { ok: true, value: { url: url.toString(), expiresAt: new Date(expires).toISOString(), mediaType: got.mediaType, sizeBytes: got.sizeBytes as number } };
  } catch { return fail("unavailable"); }
}

export async function hrDecide(raw: unknown, deps: StaffDocDependencies): Value<DecisionReceiptDto> {
  const c = checked(validateDecide(raw)); if (bad(c)) return c;
  const cmd = c.value;
  const who = await admin(deps, "write"); if (bad(who)) return who;
  const fp = fingerprint(deps, "decide", cmd); if (!fp) return fail("unavailable");
  const q = await limited(deps, who.uid); if (q) return q;
  return mutate(cmd.requestId, () => deps.gateway.hrDecide({ actorUid: who.uid, sessionId: who.sessionId, requestId: cmd.requestId, fingerprint: fp, command: cmd }), (d) =>
    d.versionId === cmd.versionId && d.decision === cmd.decision && Number.isSafeInteger(d.decisionSeq) && (d.decisionSeq as number) > cmd.expectedSeq && typeof d.replayed === "boolean"
      ? { versionId: cmd.versionId, decision: cmd.decision, decisionSeq: d.decisionSeq as number, replayed: d.replayed } : null);
}

export async function hrCompletion(raw: unknown, deps: StaffDocDependencies): Value<HrCompletionDto> {
  const c = checked(validateCompletion(raw)); if (bad(c)) return c;
  const who = await admin(deps, "read"); if (bad(who)) return who;
  const q = await limited(deps, who.uid); if (q) return q;
  return read(() => deps.gateway.completion({ actorUid: who.uid, sessionId: who.sessionId, audience: "admin", personIds: c.value.personIds }), projectHrCompletion);
}

/* ----------------------------------- Client (status only) ----------------------------------- */

export async function clientCompletion(raw: unknown, deps: StaffDocDependencies): Value<ClientCompletionDto> {
  const c = checked(validateCompletion(raw)); if (bad(c)) return c;
  const who = await client(deps); if (bad(who)) return who;
  const q = await limited(deps, who.uid); if (q) return q;
  return read(() => deps.gateway.completion({ actorUid: who.uid, sessionId: who.sessionId, audience: "client", personIds: c.value.personIds }), projectClientCompletion);
}
