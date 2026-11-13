/** Server-only orchestration for a versioned vacancy configuration write. */
import { validateVacancyConfiguration, type VacancyConfiguration } from "./config-validation";
import type { VacancyWriteIdentity } from "./write-service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const DB_REASONS = ["no_access", "conflict", "invalid_request", "unavailable"] as const;
export type VacancyConfigWriteCode = typeof DB_REASONS[number] | "unauthenticated" | "mfa_required" | "rate_limited" | "outcome_unknown";
export type VacancyConfigWriteResult =
  | { ok: true; revision: number; replayed: boolean }
  | { ok: false; code: VacancyConfigWriteCode; fields?: Record<string, string>; requestId?: string };
export type VacancyConfigCommand = { requestId: string; expectedRevision: number; configuration: VacancyConfiguration };
export type VacancyConfigSaveArgs = {
  p_actor_uid: string; p_session_id: string; p_request_id: string; p_revision: number;
  p_snapshot: VacancyConfiguration; p_fingerprint: string;
};
export type VacancyConfigDependencies = {
  enabled: boolean;
  verifyIdentity(): Promise<VacancyWriteIdentity>;
  consumeLimit(uid: string): Promise<void>;
  fingerprint(command: VacancyConfigCommand): string;
  save(args: VacancyConfigSaveArgs): Promise<{ data: unknown; error: unknown }>;
};
export type VacancyConfigurationDependencies = VacancyConfigDependencies;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function unknownOutcome(requestId: string): VacancyConfigWriteResult {
  return { ok: false, code: "outcome_unknown", requestId };
}

export async function saveVacancyConfiguration(raw: unknown, deps: VacancyConfigDependencies): Promise<VacancyConfigWriteResult> {
  if (!deps.enabled) return { ok: false, code: "unavailable" };

  let identity: VacancyWriteIdentity;
  try { identity = await deps.verifyIdentity(); }
  catch { return { ok: false, code: "unavailable" }; }
  if (!identity || !identity.emailVerified || typeof identity.uid !== "string" || !UUID.test(identity.uid) || typeof identity.sessionId !== "string" || !UUID.test(identity.sessionId)) return { ok: false, code: "unauthenticated" };
  if (identity.aal !== "aal2") return { ok: false, code: "mfa_required" };

  let command: VacancyConfigCommand;
  try {
    if (!record(raw) || Object.keys(raw).some(key => !["requestId", "expectedRevision", "configuration"].includes(key)) || typeof raw.requestId !== "string" || !UUID.test(raw.requestId) || !Number.isSafeInteger(raw.expectedRevision) || Number(raw.expectedRevision) < 0 || Number(raw.expectedRevision) > 2147483645) return { ok: false, code: "invalid_request" };
    const result = validateVacancyConfiguration(raw.configuration);
    if (!result.ok) return { ok: false, code: "invalid_request", fields: result.fields };
    command = { requestId: raw.requestId.toLowerCase(), expectedRevision: Number(raw.expectedRevision), configuration: result.value };
  } catch { return { ok: false, code: "invalid_request" }; }

  try { await deps.consumeLimit(identity.uid.toLowerCase()); }
  catch (error) { return { ok: false, code: error !== null && typeof error === "object" && "code" in error && error.code === "rate_limited" ? "rate_limited" : "unavailable" }; }

  let fingerprint: string;
  try { fingerprint = deps.fingerprint(command); }
  catch { return { ok: false, code: "unavailable" }; }
  if (typeof fingerprint !== "string" || !HASH.test(fingerprint)) return { ok: false, code: "unavailable" };
  const args: VacancyConfigSaveArgs = {
    p_actor_uid: identity.uid.toLowerCase(), p_session_id: identity.sessionId.toLowerCase(),
    p_request_id: command.requestId, p_revision: command.expectedRevision,
    p_snapshot: command.configuration, p_fingerprint: fingerprint,
  };
  let response: { data: unknown; error: unknown };
  try { response = await deps.save(args); }
  catch { return unknownOutcome(command.requestId); }
  if (!response || response.error) return unknownOutcome(command.requestId);
  const data = record(response.data) ? response.data : null;
  if (data?.ok === false && typeof data.reason === "string") {
    if ((DB_REASONS as readonly string[]).includes(data.reason)) return { ok: false, code: data.reason as typeof DB_REASONS[number] };
    return unknownOutcome(command.requestId);
  }
  if (data?.ok !== true || !Number.isSafeInteger(data.revision) || Number(data.revision) < 1 || Number(data.revision) > 2147483646 || typeof data.replayed !== "boolean") return unknownOutcome(command.requestId);
  return { ok: true, revision: Number(data.revision), replayed: data.replayed };
}
