/** Browser transport for vacancy writes. Callers own request IDs and retries. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = ["draft", "pending-approval", "published", "paused", "closed", "filled", "cancelled"] as const;
const CODES = ["invalid_request", "unauthenticated", "mfa_required", "no_access", "conflict", "invalid_transition", "publication_not_ready", "rate_limited", "unavailable", "forbidden", "outcome_unknown"] as const;

export type VacancyWriteClientCode = typeof CODES[number];
export type VacancyWriteClientResult =
  | { ok: true; id: string; revision: number; status: typeof STATUSES[number]; replayed: boolean }
  | { ok: false; code: VacancyWriteClientCode; fields?: Record<string, string>; requestId?: string };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function validRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 2147483646;
}
function unknownOutcome(requestId: string): VacancyWriteClientResult {
  return { ok: false, code: "outcome_unknown", requestId };
}
function safeFields(value: unknown): Record<string, string> | null {
  if (!record(value) || Object.keys(value).length > 64) return null;
  const fields: Record<string, string> = {};
  for (const [key, message] of Object.entries(value)) {
    if (!/^[A-Za-z][A-Za-z0-9.[\]_-]{0,99}$/.test(key) || typeof message !== "string" || message.length > 200 || /[\u0000-\u001f\u007f]/.test(message)) return null;
    Object.defineProperty(fields, key, { value: message, enumerable: true, configurable: true, writable: true });
  }
  return fields;
}

/** This does not decide role, scope, state transition, or form validity; the server does. */
export async function submitVacancyCommand(command: unknown, fetcher: typeof fetch = fetch): Promise<VacancyWriteClientResult> {
  let requestId: string;
  let body: string;
  try {
    if (!record(command) || typeof command.requestId !== "string" || !UUID.test(command.requestId)) return { ok: false, code: "invalid_request" };
    requestId = command.requestId.toLowerCase();
    if (command.kind !== "create" && command.kind !== "update" && command.kind !== "action") return { ok: false, code: "invalid_request" };
    if (command.kind === "create") {
      if ("id" in command || "expectedRevision" in command) return { ok: false, code: "invalid_request" };
    } else if (typeof command.id !== "string" || !UUID.test(command.id) || !validRevision(command.expectedRevision)) {
      return { ok: false, code: "invalid_request" };
    }
    body = JSON.stringify(command);
    if (typeof body !== "string") return { ok: false, code: "invalid_request" };
    const serialized: unknown = JSON.parse(body);
    if (!record(serialized) || serialized.kind !== command.kind || typeof serialized.requestId !== "string" || serialized.requestId.toLowerCase() !== requestId) return { ok: false, code: "invalid_request" };
    if (command.kind !== "create" && (serialized.id !== command.id || serialized.expectedRevision !== command.expectedRevision)) return { ok: false, code: "invalid_request" };
  } catch {
    return { ok: false, code: "invalid_request" };
  }

  try {
    const response = await fetcher("/api/admin/vacancies/write", {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json" }, body,
    });
    const envelope: unknown = await response.json();
    if (!record(envelope)) return unknownOutcome(requestId);
    if (response.ok) {
      if (envelope.ok !== true || typeof envelope.id !== "string" || !UUID.test(envelope.id) || !validRevision(envelope.revision) || !STATUSES.includes(envelope.status as typeof STATUSES[number]) || typeof envelope.replayed !== "boolean") return unknownOutcome(requestId);
      return { ok: true, id: envelope.id.toLowerCase(), revision: envelope.revision, status: envelope.status as typeof STATUSES[number], replayed: envelope.replayed };
    }
    if (envelope.ok !== false || !record(envelope.error) || typeof envelope.error.code !== "string" || !CODES.includes(envelope.error.code as VacancyWriteClientCode) || typeof envelope.error.message !== "string") return unknownOutcome(requestId);
    const code = envelope.error.code as VacancyWriteClientCode;
    if (code === "outcome_unknown") return unknownOutcome(requestId);
    const fields = envelope.error.fields === undefined ? undefined : safeFields(envelope.error.fields);
    if (fields === null) return unknownOutcome(requestId);
    return { ok: false, code, ...(fields ? { fields } : {}) };
  } catch {
    return unknownOutcome(requestId);
  }
}
