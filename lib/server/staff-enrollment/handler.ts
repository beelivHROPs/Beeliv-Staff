/** HTTP edge for Staff enrollment: method, origin, content-type and body-size checks, then the service. POST only, never cached. */
import {
  getChecklist, getEmployment, getProfile, getPersonalDetails, getSensitiveStatus, saveAccessibility, saveBankDetails, saveEmployer, saveNextOfKin, saveNin, savePersonalDetails,
} from "./service";
import type { StaffEnrollmentDependencies, StaffErrorCode, StaffFailure, StaffResult } from "./types";

export const MAX_BODY_BYTES = 8_000; // largest command is a few KB of bounded text

/** Fixed texts. `not_saved` is also what a duplicate NIN or bank account returns, so it says nothing specific. */
const MESSAGES: Record<StaffErrorCode, string> = {
  unavailable: "This is temporarily unavailable.", unauthenticated: "Sign in to continue.", forbidden: "You do not have access to this.",
  invalid_request: "Check the details and try again.", conflict: "This request conflicts with an earlier one. Reload before trying again.",
  not_saved: "We couldn't save your changes.", rate_limited: "Too many requests. Please wait before trying again.",
  outcome_unknown: "We could not confirm this. Check before trying again.",
};
const STATUS: Record<StaffErrorCode, number> = {
  unavailable: 503, unauthenticated: 401, forbidden: 403, invalid_request: 400, conflict: 409, not_saved: 422, rate_limited: 429, outcome_unknown: 503,
};
const HEADERS = { "Cache-Control": "private, no-store" };

function failure(error: StaffFailure): Response {
  return Response.json({ ok: false, error: { code: error.code, message: MESSAGES[error.code], ...(error.fields ? { fields: error.fields } : {}), ...(error.requestId ? { requestId: error.requestId } : {}) } },
    { status: STATUS[error.code], headers: { ...HEADERS, ...(error.code === "rate_limited" ? { "Retry-After": "300" } : {}) } });
}
async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new Error("invalid_request");
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) throw new Error("invalid_request");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_request");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new Error("invalid_request"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

type Action = (raw: unknown, deps: StaffEnrollmentDependencies) => Promise<StaffResult<{ value: unknown }>>;
/** The whole public command surface. Anything else is refused as `forbidden`. No action takes a person id. */
export const STAFF_ENROLLMENT_ACTIONS: Record<string, Action> = {
  "personal-get": getPersonalDetails, "employment-get": getEmployment, "sensitive-status": getSensitiveStatus, "checklist-get": getChecklist, "profile-get": getProfile,
  "personal-save": savePersonalDetails, "employer-save": saveEmployer, "kin-save": saveNextOfKin, "nin-save": saveNin, "bank-save": saveBankDetails, "accessibility-save": saveAccessibility,
};

export async function handleStaffEnrollment(request: Request, action: string, actions: Record<string, Action>, deps: StaffEnrollmentDependencies, origin: string): Promise<Response> {
  if (!deps.enabled) return failure({ ok: false, code: "unavailable" });
  if (request.method !== "POST" || !Object.hasOwn(actions, action)) return failure({ ok: false, code: "forbidden" });
  if (!origin || request.headers.get("origin") !== origin || new URL(request.url).origin !== origin || request.headers.get("sec-fetch-site") === "cross-site") return failure({ ok: false, code: "forbidden" });
  let raw: unknown;
  try { raw = await readJson(request); } catch { return failure({ ok: false, code: "invalid_request" }); }
  let result: StaffResult<{ value: unknown }>;
  // The body is never logged. A thrown error is swallowed into a generic reply so no input can leak through an exception message.
  try { result = await actions[action](raw, deps); } catch { return failure({ ok: false, code: "unavailable" }); }
  if (!result.ok) return failure(result);
  return Response.json({ ok: true, value: result.value }, { status: 200, headers: HEADERS });
}
