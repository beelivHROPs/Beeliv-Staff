/** HTTP edge for Staff documentation: method, origin, content-type and body-size checks, then the service. POST only, never cached. */
import { clientCompletion, completeUpload, getChecklist, getUploadStatus, hrCompletion, hrDecide, hrOpen, hrQueue, requestSlotUpload } from "./service";
import type { DocErrorCode, DocFailure, DocResult, StaffDocDependencies } from "./types";

export const MAX_BODY_BYTES = 4_000;
const MESSAGES: Record<DocErrorCode, string> = {
  unavailable: "This is temporarily unavailable.", unauthenticated: "Sign in to continue.", forbidden: "You do not have access to this.",
  invalid_request: "Check the details and try again.", conflict: "This request conflicts with an earlier one. Reload before trying again.",
  stale: "This changed since you opened it. Reload and try again.", not_found: "That was not found.", rate_limited: "Too many requests. Please wait before trying again.",
  expired: "This timed out. Start again.", limit_reached: "That limit has been reached.", outcome_unknown: "We could not confirm this. Check before trying again.",
};
const STATUS: Record<DocErrorCode, number> = {
  unavailable: 503, unauthenticated: 401, forbidden: 403, invalid_request: 400, conflict: 409, stale: 409, not_found: 404, rate_limited: 429, expired: 410, limit_reached: 429, outcome_unknown: 503,
};
const HEADERS = { "Cache-Control": "private, no-store" };

function failure(error: DocFailure): Response {
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

type Action = (raw: unknown, deps: StaffDocDependencies) => Promise<DocResult<{ value: unknown }>>;
/** The whole public command surface per session type. No action takes a person id except the HR and Client completion lists. */
export const STAFF_DOC_OWN_ACTIONS: Record<string, Action> = {
  "checklist-get": getChecklist, "slot-request": requestSlotUpload, complete: completeUpload, status: getUploadStatus,
};
export const STAFF_DOC_HR_ACTIONS: Record<string, Action> = {
  "hr-queue": hrQueue, "hr-open": hrOpen, "hr-decide": hrDecide, completion: hrCompletion,
};
/** Client app route is a later slice (its own auth is built later). Exported so it can be wired without new logic. */
export const STAFF_DOC_CLIENT_ACTIONS: Record<string, Action> = { completion: clientCompletion };

export async function handleStaffDocumentation(request: Request, action: string, actions: Record<string, Action>, deps: StaffDocDependencies, origin: string): Promise<Response> {
  if (!deps.enabled) return failure({ ok: false, code: "unavailable" });
  if (request.method !== "POST" || !Object.hasOwn(actions, action)) return failure({ ok: false, code: "forbidden" });
  if (!origin || request.headers.get("origin") !== origin || new URL(request.url).origin !== origin || request.headers.get("sec-fetch-site") === "cross-site") return failure({ ok: false, code: "forbidden" });
  let raw: unknown;
  try { raw = await readJson(request); } catch { return failure({ ok: false, code: "invalid_request" }); }
  let result: DocResult<{ value: unknown }>;
  // The body is never logged. A thrown error is swallowed into a generic reply so no input can leak through an exception message.
  try { result = await actions[action](raw, deps); } catch { return failure({ ok: false, code: "unavailable" }); }
  if (!result.ok) return failure(result);
  return Response.json({ ok: true, value: result.value }, { status: 200, headers: HEADERS });
}
