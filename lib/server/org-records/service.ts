/**
 * Org records service. Pure: every effect goes through the injected dependencies, so it is testable
 * offline. It never trusts browser ownership; the database re-resolves the actor, capability and scope.
 */
import {
  plain, validateClientCreate, validateClientDeactivate, validateClientGet, validateClientList, validateClientUpdate, validateOutletCreate, validateOutletDeactivate,
  validateOutletUpdate, validatePlacementAssign, validateStaffCorrectEmail, validateStaffCreate, validateStaffGet, validateStaffList, validateStaffUpdate, type Checked,
} from "./validation";
import { id, projectClientDetail, projectClientRow, projectPage, projectStaffDetail, projectStaffRow } from "./project";
import type {
  AdminIdentity, ClientCreateReceipt, ClientDetailDto, ClientRowDto, OrgErrorCode, OrgFailure, OrgOperation, OrgRecordsDependencies, OrgResult, OutletCreateReceipt,
  Page, PlacementReceipt, RpcReply, StaffCreateReceipt, StaffDetailDto, StaffRowDto, UpdateReceipt,
} from "./types";

/** Database reason -> safe public code. Anything unknown becomes `unavailable`; text is never forwarded. */
const REASONS: Readonly<Record<string, OrgErrorCode>> = {
  no_access: "forbidden", not_found: "not_found", invalid_request: "invalid_request", conflict: "conflict", stale: "stale", duplicate: "duplicate",
  inactive: "inactive", rate_limited: "rate_limited", unavailable: "unavailable",
};
const fail = (code: OrgErrorCode, extra: Partial<OrgFailure> = {}): OrgFailure => ({ ok: false, code, ...extra });
type Reply = { data: Record<string, unknown> };
type Value<T> = Promise<OrgResult<{ value: T }>>;

async function admin(deps: OrgRecordsDependencies, write: boolean): Promise<AdminIdentity | OrgFailure> {
  if (!deps.enabled || (write && !deps.writesEnabled)) return fail("unavailable");
  let who: AdminIdentity | null;
  try { who = await deps.verifyAdmin(); } catch { return fail("unavailable"); }
  if (!who || !who.emailVerified || !id(who.uid) || !id(who.sessionId)) return fail("unauthenticated");
  // Admin always needs the second factor; the database verifies the real session level again.
  if (who.aal !== "aal2") return fail("forbidden");
  return who;
}
async function limited(deps: OrgRecordsDependencies, uid: string, write: boolean): Promise<OrgFailure | null> {
  try { await deps.consumeLimit(uid, write); return null; } catch (error) {
    return plain(error) && error.code === "rate_limited" ? fail("rate_limited") : fail("unavailable");
  }
}
function fingerprint(deps: OrgRecordsDependencies, op: OrgOperation, command: unknown): string | null {
  try { const f = deps.fingerprint(op, command); return /^[a-f0-9]{64}$/.test(f) ? f : null; } catch { return null; }
}
const FIELD_NAME = /^[A-Za-z]{1,30}$/;
function fieldsOf(value: unknown): Record<string, string> | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const name of value.slice(0, 8)) if (typeof name === "string" && FIELD_NAME.test(name)) out[name] = "Check this field.";
  return Object.keys(out).length ? out : undefined;
}
/** Returns the reply record, a definite denial, or null when the outcome cannot be trusted. */
function interpret(reply: RpcReply | undefined): Reply | OrgFailure | null {
  if (!reply || reply.error || !plain(reply.data)) return null;
  if (reply.data.ok === false) {
    const code = typeof reply.data.reason === "string" && REASONS[reply.data.reason] ? REASONS[reply.data.reason] : "unavailable";
    const fields = code === "duplicate" || code === "invalid_request" ? fieldsOf(reply.data.fields) : undefined;
    return fail(code, fields ? { fields } : {});
  }
  return reply.data.ok === true ? { data: reply.data } : null;
}
const denied = (x: Reply | OrgFailure | null): x is OrgFailure => !!x && "ok" in x && x.ok === false;

/** Run a mutation. An untrustworthy/absent reply is `outcome_unknown` with the original requestId. */
async function mutate<T>(requestId: string, call: () => PromiseLike<RpcReply>, build: (d: Record<string, unknown>) => T | null): Value<T> {
  let reply: RpcReply | undefined;
  try { reply = await call(); } catch { return fail("outcome_unknown", { requestId }); }
  const got = interpret(reply);
  if (denied(got)) return got;
  const value = got ? build(got.data) : null;
  return value === null ? fail("outcome_unknown", { requestId }) : { ok: true, value };
}
async function read<T>(call: () => PromiseLike<RpcReply>, build: (d: Record<string, unknown>) => T | null): Value<T> {
  let reply: RpcReply | undefined;
  try { reply = await call(); } catch { return fail("unavailable"); }
  const got = interpret(reply);
  if (denied(got)) return got;
  const value = got ? build(got.data) : null;
  return value === null ? fail("unavailable") : { ok: true, value };
}

type Prepared<C extends { requestId: string }> = { who: AdminIdentity; cmd: C; fp: string } | OrgFailure;
/** Common write preamble: validate, authenticate, fingerprint, rate-limit. Order matters: nothing runs for an invalid body. */
async function prepareWrite<C extends { requestId: string }>(raw: unknown, deps: OrgRecordsDependencies, op: OrgOperation, validate: (r: unknown) => Checked<C>): Promise<Prepared<C>> {
  const who = await admin(deps, true); if ("ok" in who) return who;
  const checked = validate(raw); if (!checked.ok) return fail("invalid_request", { fields: checked.fields });
  const fp = fingerprint(deps, op, checked.value); if (!fp) return fail("unavailable");
  const limit = await limited(deps, who.uid, true); if (limit) return limit;
  return { who, cmd: checked.value, fp };
}
const actor = (who: AdminIdentity) => ({ actorUid: who.uid, sessionId: who.sessionId });

/* ------------------------------------ reads ------------------------------------ */

export async function listClients(raw: unknown, deps: OrgRecordsDependencies): Value<Page<ClientRowDto>> {
  const who = await admin(deps, false); if ("ok" in who) return who;
  const q = validateClientList(raw); if (!q.ok) return fail("invalid_request", { fields: q.fields });
  const limit = await limited(deps, who.uid, false); if (limit) return limit;
  return read(() => deps.gateway.clientList({ ...actor(who), query: q.value }), (d) => projectPage(d, projectClientRow, q.value.pageSize, q.value.page));
}
export async function getClient(raw: unknown, deps: OrgRecordsDependencies): Value<ClientDetailDto> {
  const who = await admin(deps, false); if ("ok" in who) return who;
  const q = validateClientGet(raw); if (!q.ok) return fail("invalid_request", { fields: q.fields });
  const limit = await limited(deps, who.uid, false); if (limit) return limit;
  return read(() => deps.gateway.clientGet({ ...actor(who), ...q.value }), (d) => {
    const item = projectClientDetail(d.item, q.value.outletsLimit, q.value.outletsAfter);
    return item && item.id === q.value.clientId ? item : null;
  });
}
export async function listStaff(raw: unknown, deps: OrgRecordsDependencies): Value<Page<StaffRowDto>> {
  const who = await admin(deps, false); if ("ok" in who) return who;
  const q = validateStaffList(raw); if (!q.ok) return fail("invalid_request", { fields: q.fields });
  const limit = await limited(deps, who.uid, false); if (limit) return limit;
  return read(() => deps.gateway.staffList({ ...actor(who), query: q.value }), (d) => projectPage(d, projectStaffRow, q.value.pageSize, q.value.page));
}
export async function getStaff(raw: unknown, deps: OrgRecordsDependencies): Value<StaffDetailDto> {
  const who = await admin(deps, false); if ("ok" in who) return who;
  const q = validateStaffGet(raw); if (!q.ok) return fail("invalid_request", { fields: q.fields });
  const limit = await limited(deps, who.uid, false); if (limit) return limit;
  return read(() => deps.gateway.staffGet({ ...actor(who), ...q.value }), (d) => {
    const item = projectStaffDetail(d.item, q.value.historyLimit, q.value.historyAfter);
    return item && item.id === q.value.staffId ? item : null;
  });
}

/* ----------------------------------- writes ----------------------------------- */

const rev = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 1 && (v as number) <= 1_000_000;
const ref = (v: unknown, prefix: string): v is string => typeof v === "string" && v.startsWith(prefix) && v.length <= 60;

/** A fresh write moves the revision exactly one ahead of what was edited; a replay may be older or equal. */
const revisionOk = (revision: number, expected: number, replayed: boolean) => (replayed ? revision >= expected + 1 : revision === expected + 1);

export async function createClient(raw: unknown, deps: OrgRecordsDependencies): Value<ClientCreateReceipt> {
  const p = await prepareWrite(raw, deps, "client-create", validateClientCreate); if ("ok" in p) return p;
  return mutate(p.cmd.requestId, () => deps.gateway.clientCreate({ ...actor(p.who), ...p.cmd, fingerprint: p.fp }), (d) =>
    id(d.clientId) && ref(d.reference, "BLV-CLI-") && rev(d.revision) && typeof d.replayed === "boolean" ? { clientId: d.clientId, reference: d.reference, revision: d.revision, replayed: d.replayed } : null);
}
export async function updateClient(raw: unknown, deps: OrgRecordsDependencies): Value<UpdateReceipt> {
  const p = await prepareWrite(raw, deps, "client-update", validateClientUpdate); if ("ok" in p) return p;
  return mutate(p.cmd.requestId, () => deps.gateway.clientUpdate({ ...actor(p.who), ...p.cmd, fingerprint: p.fp }), (d) =>
    d.clientId === p.cmd.clientId && rev(d.revision) && typeof d.replayed === "boolean" && revisionOk(d.revision, p.cmd.expectedRevision, d.replayed) ? { id: p.cmd.clientId, revision: d.revision, replayed: d.replayed } : null);
}
export async function deactivateClient(raw: unknown, deps: OrgRecordsDependencies): Value<UpdateReceipt> {
  const p = await prepareWrite(raw, deps, "client-deactivate", validateClientDeactivate); if ("ok" in p) return p;
  return mutate(p.cmd.requestId, () => deps.gateway.clientDeactivate({ ...actor(p.who), ...p.cmd, fingerprint: p.fp }), (d) =>
    d.clientId === p.cmd.clientId && rev(d.revision) && typeof d.replayed === "boolean" && revisionOk(d.revision, p.cmd.expectedRevision, d.replayed) ? { id: p.cmd.clientId, revision: d.revision, replayed: d.replayed } : null);
}
export async function createOutlet(raw: unknown, deps: OrgRecordsDependencies): Value<OutletCreateReceipt> {
  const p = await prepareWrite(raw, deps, "outlet-create", validateOutletCreate); if ("ok" in p) return p;
  return mutate(p.cmd.requestId, () => deps.gateway.outletCreate({ ...actor(p.who), ...p.cmd, fingerprint: p.fp }), (d) =>
    d.clientId === p.cmd.clientId && id(d.outletId) && ref(d.reference, "BLV-OUT-") && rev(d.revision) && typeof d.replayed === "boolean"
      ? { clientId: p.cmd.clientId, outletId: d.outletId, reference: d.reference, revision: d.revision, replayed: d.replayed } : null);
}
export async function updateOutlet(raw: unknown, deps: OrgRecordsDependencies): Value<UpdateReceipt> {
  const p = await prepareWrite(raw, deps, "outlet-update", validateOutletUpdate); if ("ok" in p) return p;
  return mutate(p.cmd.requestId, () => deps.gateway.outletUpdate({ ...actor(p.who), ...p.cmd, fingerprint: p.fp }), (d) =>
    d.outletId === p.cmd.outletId && rev(d.revision) && typeof d.replayed === "boolean" && revisionOk(d.revision, p.cmd.expectedRevision, d.replayed) ? { id: p.cmd.outletId, revision: d.revision, replayed: d.replayed } : null);
}
export async function deactivateOutlet(raw: unknown, deps: OrgRecordsDependencies): Value<UpdateReceipt> {
  const p = await prepareWrite(raw, deps, "outlet-deactivate", validateOutletDeactivate); if ("ok" in p) return p;
  return mutate(p.cmd.requestId, () => deps.gateway.outletDeactivate({ ...actor(p.who), ...p.cmd, fingerprint: p.fp }), (d) =>
    d.outletId === p.cmd.outletId && rev(d.revision) && typeof d.replayed === "boolean" && revisionOk(d.revision, p.cmd.expectedRevision, d.replayed) ? { id: p.cmd.outletId, revision: d.revision, replayed: d.replayed } : null);
}
export async function createStaff(raw: unknown, deps: OrgRecordsDependencies): Value<StaffCreateReceipt> {
  const p = await prepareWrite(raw, deps, "staff-create", validateStaffCreate); if ("ok" in p) return p;
  return mutate(p.cmd.requestId, () => deps.gateway.staffCreate({ ...actor(p.who), ...p.cmd, fingerprint: p.fp }), (d) =>
    id(d.staffId) && ref(d.reference, "BLV-STF-") && rev(d.revision) && typeof d.replayed === "boolean" ? { staffId: d.staffId, reference: d.reference, revision: d.revision, replayed: d.replayed } : null);
}
export async function updateStaff(raw: unknown, deps: OrgRecordsDependencies): Value<UpdateReceipt> {
  const p = await prepareWrite(raw, deps, "staff-update", validateStaffUpdate); if ("ok" in p) return p;
  return mutate(p.cmd.requestId, () => deps.gateway.staffUpdate({ ...actor(p.who), ...p.cmd, fingerprint: p.fp }), (d) =>
    d.staffId === p.cmd.staffId && rev(d.revision) && typeof d.replayed === "boolean" && revisionOk(d.revision, p.cmd.expectedRevision, d.replayed) ? { id: p.cmd.staffId, revision: d.revision, replayed: d.replayed } : null);
}
export async function correctStaffEmail(raw: unknown, deps: OrgRecordsDependencies): Value<UpdateReceipt> {
  const p = await prepareWrite(raw, deps, "staff-correct-email", validateStaffCorrectEmail); if ("ok" in p) return p;
  return mutate(p.cmd.requestId, () => deps.gateway.staffCorrectEmail({ ...actor(p.who), ...p.cmd, fingerprint: p.fp }), (d) =>
    d.staffId === p.cmd.staffId && rev(d.revision) && typeof d.replayed === "boolean" && revisionOk(d.revision, p.cmd.expectedRevision, d.replayed) ? { id: p.cmd.staffId, revision: d.revision, replayed: d.replayed } : null);
}
export async function assignPlacement(raw: unknown, deps: OrgRecordsDependencies): Value<PlacementReceipt> {
  const p = await prepareWrite(raw, deps, "placement-assign", validatePlacementAssign); if ("ok" in p) return p;
  return mutate(p.cmd.requestId, () => deps.gateway.placementAssign({ ...actor(p.who), ...p.cmd, fingerprint: p.fp }), (d) =>
    d.staffId === p.cmd.staffId && id(d.placementId) && rev(d.revision) && typeof d.replayed === "boolean" && revisionOk(d.revision, p.cmd.expectedRevision, d.replayed)
      ? { staffId: p.cmd.staffId, placementId: d.placementId, revision: d.revision, replayed: d.replayed } : null);
}
