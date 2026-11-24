/**
 * Recruitment phase 3 (docs/contracts/recruitment-approval-phase3.sql): HR marks documents verified (stage 3 -> 4),
 * then the Head of Operations approves (-> staff record, stage 5, lifecycle completed) or declines (reason required).
 * The database decides who may do what (application.manage in scope; approve/decline = Head of Operations role only).
 * Same pattern as phase 1/2: verified actor + session, strict validation, shared rate limit, rebuilt receipt.
 */
import { UUID, plain } from "./validation";
import { admin, denied, fail, interpret, limited } from "./service";
import { functionMissing } from "./interviews";
import type { ApplicationLifecycle, ApplicationResult, ApplicationsDependencies, RpcReply } from "./types";

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const MAX_NOTE = 2000;

export type VerifyCommand = { applicationId: string; expectedRevision: number; note: string | null };
export type DecideCommand = { applicationId: string; expectedRevision: number; decision: "approve" | "decline"; note: string | null };
export type VerifyReceiptDto = { revision: number; lifecycle: ApplicationLifecycle; stage: number };
export type DecideReceiptDto = VerifyReceiptDto & { staffId: string | null; reference: string | null };
type Checked<T> = { ok: true; value: T } | { ok: false; code: "invalid_request" | "note_required" };

function onlyKeys(raw: unknown, required: readonly string[], optional: readonly string[]): raw is Record<string, unknown> {
  if (!plain(raw)) return false;
  const keys = Object.keys(raw);
  return keys.every((k) => required.includes(k) || optional.includes(k)) && required.every((k) => keys.includes(k));
}
function note(v: unknown): string | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string" || v.length > MAX_NOTE * 2) return undefined;
  const clean = v.trim();
  return clean.length > MAX_NOTE || CONTROL.test(clean) ? undefined : clean || null;
}
const rev = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 1 && (v as number) <= 1_000_000;

export function validateVerify(raw: unknown): Checked<VerifyCommand> {
  if (!onlyKeys(raw, ["applicationId", "expectedRevision"], ["note"])) return { ok: false, code: "invalid_request" };
  const n = note(raw.note);
  if (typeof raw.applicationId !== "string" || !UUID.test(raw.applicationId) || !rev(raw.expectedRevision) || n === undefined) return { ok: false, code: "invalid_request" };
  return { ok: true, value: { applicationId: raw.applicationId.toLowerCase(), expectedRevision: raw.expectedRevision as number, note: n } };
}

export function validateDecide(raw: unknown): Checked<DecideCommand> {
  if (!onlyKeys(raw, ["applicationId", "expectedRevision", "decision"], ["note"])) return { ok: false, code: "invalid_request" };
  const n = note(raw.note);
  if (typeof raw.applicationId !== "string" || !UUID.test(raw.applicationId) || !rev(raw.expectedRevision) || n === undefined
    || (raw.decision !== "approve" && raw.decision !== "decline")) return { ok: false, code: "invalid_request" };
  if (raw.decision === "decline" && !n) return { ok: false, code: "note_required" };
  return { ok: true, value: { applicationId: raw.applicationId.toLowerCase(), expectedRevision: raw.expectedRevision as number, decision: raw.decision, note: n } };
}

async function mutate<T>(requestId: string, call: () => PromiseLike<RpcReply>, build: (d: Record<string, unknown>) => T | null): Promise<ApplicationResult<{ value: T }>> {
  let reply: RpcReply | undefined;
  try { reply = await call(); } catch { return fail("outcome_unknown", { requestId }); }
  if (functionMissing(reply)) return fail("unavailable");
  const got = interpret(reply);
  if (denied(got)) return got;
  const value = got ? build(got.data) : null;
  return value === null ? fail("outcome_unknown", { requestId }) : { ok: true, value };
}

export async function adminVerifyDocuments(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: VerifyReceiptDto }>> {
  const who = await admin(deps); if ("ok" in who) return who;
  const c = validateVerify(raw); if (!c.ok) return fail(c.code);
  const limit = await limited(deps, who.uid); if (limit) return limit;
  const v = c.value;
  return mutate(v.applicationId, () => deps.gateway.adminVerify({ actorUid: who.uid, sessionId: who.sessionId, ...v }), (d) =>
    d.revision === v.expectedRevision + 1 && d.lifecycle === "submitted" && d.stage === 4 ? { revision: d.revision as number, lifecycle: "submitted" as const, stage: 4 } : null);
}

export async function adminDecideApplication(raw: unknown, deps: ApplicationsDependencies): Promise<ApplicationResult<{ value: DecideReceiptDto }>> {
  const who = await admin(deps); if ("ok" in who) return who;
  const c = validateDecide(raw); if (!c.ok) return fail(c.code);
  const limit = await limited(deps, who.uid); if (limit) return limit;
  const v = c.value;
  return mutate(v.applicationId, () => deps.gateway.hooDecide({ actorUid: who.uid, sessionId: who.sessionId, ...v }), (d) => {
    if (d.revision !== v.expectedRevision + 1) return null;
    if (v.decision === "decline") return d.lifecycle === "not_selected" ? { revision: d.revision as number, lifecycle: "not_selected" as const, stage: 4, staffId: null, reference: null } : null;
    if (d.lifecycle !== "completed" || d.stage !== 5 || typeof d.staffId !== "string" || !UUID.test(d.staffId) || typeof d.reference !== "string" || !/^BLV-STF-\d{6,}$/.test(d.reference)) return null;
    return { revision: d.revision as number, lifecycle: "completed" as const, stage: 5, staffId: d.staffId, reference: d.reference };
  });
}
