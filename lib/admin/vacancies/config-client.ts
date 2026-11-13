/** Browser transport for versioned vacancy configuration saves. The caller owns retries. */
const PATH = "/api/admin/vacancies/configure";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODES = ["unavailable", "invalid_request", "forbidden", "unauthenticated", "mfa_required", "no_access", "conflict", "rate_limited", "outcome_unknown"] as const;

export type VacancyConfigClientCode = typeof CODES[number];
export type VacancyConfigClientResult =
  | { ok: true; revision: number; replayed: boolean }
  | { ok: false; code: VacancyConfigClientCode; fields?: Record<string, string>; requestId?: string };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function unknownOutcome(requestId: string): VacancyConfigClientResult {
  return { ok: false, code: "outcome_unknown", requestId };
}
function safeFields(value: unknown): Record<string, string> | null {
  if (!record(value) || Object.keys(value).length > 64) return null;
  const fields: Record<string, string> = {};
  for (const [key, message] of Object.entries(value)) {
    if (!/^[A-Za-z][A-Za-z0-9.[\]_-]{0,99}$/.test(key) || typeof message !== "string" || message.length > 200 || /[\u0000-\u001f\u007f]/.test(message)) return null;
    Object.defineProperty(fields, key, { value: message, enumerable: true, writable: true, configurable: true });
  }
  return fields;
}

/** Does not grant authority or make retry decisions; the server validates the configuration and revision. */
export async function submitVacancyConfiguration(command: unknown, fetcher: typeof fetch = fetch): Promise<VacancyConfigClientResult> {
  let requestId: string;
  let body: string;
  try {
    if (!record(command) || Object.keys(command).some(key => !["requestId", "expectedRevision", "configuration"].includes(key)) || typeof command.requestId !== "string" || !UUID.test(command.requestId) || !Number.isSafeInteger(command.expectedRevision) || Number(command.expectedRevision) < 0 || Number(command.expectedRevision) > 2147483645 || !record(command.configuration)) return { ok: false, code: "invalid_request" };
    requestId = command.requestId.toLowerCase();
    body = JSON.stringify({ requestId, expectedRevision: command.expectedRevision, configuration: command.configuration });
    if (new TextEncoder().encode(body).byteLength > 140000) return { ok: false, code: "invalid_request" };
    const selected: unknown = JSON.parse(body);
    if (!record(selected) || selected.requestId !== requestId || selected.expectedRevision !== command.expectedRevision || !record(selected.configuration)) return { ok: false, code: "invalid_request" };
  } catch { return { ok: false, code: "invalid_request" }; }

  try {
    const response = await fetcher(PATH, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body });
    const envelope: unknown = await response.json();
    if (!record(envelope)) return unknownOutcome(requestId);
    if (response.ok) {
      if (envelope.ok !== true || !Number.isSafeInteger(envelope.revision) || Number(envelope.revision) < 1 || Number(envelope.revision) > 2147483646 || typeof envelope.replayed !== "boolean") return unknownOutcome(requestId);
      return { ok: true, revision: Number(envelope.revision), replayed: envelope.replayed };
    }
    if (envelope.ok !== false || !record(envelope.error) || typeof envelope.error.code !== "string" || !CODES.includes(envelope.error.code as VacancyConfigClientCode) || typeof envelope.error.message !== "string") return unknownOutcome(requestId);
    const code = envelope.error.code as VacancyConfigClientCode;
    if (code === "outcome_unknown") return unknownOutcome(requestId);
    const fields = envelope.error.fields === undefined ? undefined : safeFields(envelope.error.fields);
    if (fields === null) return unknownOutcome(requestId);
    return { ok: false, code, ...(fields ? { fields } : {}) };
  } catch { return unknownOutcome(requestId); }
}
