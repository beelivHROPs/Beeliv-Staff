/** Pure orchestration for a vacancy write. The database owns authority and transitions. */
import { parseVacancyCommand } from "./commands";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const STATUSES = ["draft", "pending-approval", "published", "paused", "closed", "filled", "cancelled"];
const DB_REASONS = ["no_access", "conflict", "invalid_request", "invalid_transition", "publication_not_ready", "unavailable"] as const;
export type VacancyWriteCode = typeof DB_REASONS[number] | "unauthenticated" | "mfa_required" | "rate_limited" | "outcome_unknown";
export type VacancyWriteResult =
  | { ok: true; id: string; revision: number; status: string; replayed: boolean }
  | { ok: false; code: VacancyWriteCode; fields?: Record<string, string>; requestId?: string };
export type VacancyWriteIdentity = { uid: string; sessionId: string; aal: string; emailVerified: boolean };
export type VacancyMutationArgs = {
  p_actor_uid: string; p_session_id: string; p_kind: "create" | "update" | "action";
  p_request_id: string; p_id: string | null; p_revision: number | null;
  p_intent: "save" | "submit-for-approval" | "publish" | null;
  p_action: string | null; p_reason: string | null;
  p_snapshot: unknown | null; p_fingerprint: string;
};
export type VacancyWriteDependencies = {
  enabled: boolean;
  verifyIdentity(): Promise<VacancyWriteIdentity>;
  consumeLimit(uid: string): Promise<void>;
  mutate(args: VacancyMutationArgs): Promise<{ data: unknown; error: unknown }>;
  fingerprint(command: Exclude<ReturnType<typeof parseVacancyCommand>, { kind: "invalid" }>): string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function unknownOutcome(requestId: string): VacancyWriteResult {
  return { ok: false, code: "outcome_unknown", requestId };
}

export async function writeVacancy(raw: unknown, deps: VacancyWriteDependencies): Promise<VacancyWriteResult> {
  // Do not inspect user input or contact a provider when the feature is closed.
  if (!deps.enabled) return { ok: false, code: "unavailable" };

  let identity: VacancyWriteIdentity;
  try { identity = await deps.verifyIdentity(); }
  catch { return { ok: false, code: "unavailable" }; }
  if (!identity || !identity.emailVerified || typeof identity.uid !== "string" || !UUID.test(identity.uid) || typeof identity.sessionId !== "string" || !UUID.test(identity.sessionId)) return { ok: false, code: "unauthenticated" };
  if (identity.aal !== "aal2") return { ok: false, code: "mfa_required" };

  let command: ReturnType<typeof parseVacancyCommand>;
  try { command = parseVacancyCommand(raw); }
  catch { return { ok: false, code: "invalid_request" }; }
  if (command.kind === "invalid") return { ok: false, code: "invalid_request", fields: command.fields };

  try { await deps.consumeLimit(identity.uid.toLowerCase()); }
  catch (error) { return { ok: false, code: error !== null && typeof error === "object" && "code" in error && error.code === "rate_limited" ? "rate_limited" : "unavailable" }; }

  let fingerprint: string;
  try { fingerprint = deps.fingerprint(command); }
  catch { return { ok: false, code: "unavailable" }; }
  if (typeof fingerprint !== "string" || !HASH.test(fingerprint)) return { ok: false, code: "unavailable" };
  const args: VacancyMutationArgs = {
    p_actor_uid: identity.uid.toLowerCase(), p_session_id: identity.sessionId.toLowerCase(),
    p_kind: command.kind, p_request_id: command.requestId, p_id: command.id,
    p_revision: command.expectedRevision,
    p_intent: command.kind === "action" ? null : command.intent,
    p_action: command.kind === "action" ? command.action : null,
    p_reason: command.kind === "action" ? command.reason : null,
    p_snapshot: command.kind === "action" ? null : command.input,
    p_fingerprint: fingerprint,
  };
  let result: { data: unknown; error: unknown };
  try { result = await deps.mutate(args); }
  catch { return unknownOutcome(command.requestId); }
  if (!result || result.error) return unknownOutcome(command.requestId);
  const data = isRecord(result.data) ? result.data : null;
  if (data?.ok === false && typeof data.reason === "string") {
    if ((DB_REASONS as readonly string[]).includes(data.reason)) return { ok: false, code: data.reason as typeof DB_REASONS[number] };
    return unknownOutcome(command.requestId);
  }
  if (data?.ok !== true || typeof data.id !== "string" || !UUID.test(data.id) || !Number.isSafeInteger(data.revision) || Number(data.revision) < 1 || Number(data.revision) > 2147483646 || !STATUSES.includes(String(data.status)) || typeof data.replayed !== "boolean") return unknownOutcome(command.requestId);
  return { ok: true, id: data.id.toLowerCase(), revision: Number(data.revision), status: String(data.status), replayed: data.replayed };
}
