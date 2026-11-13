/** HTTP edge for the applications module: method, origin, content-type and body-size checks, then the service. */
import { adminListApplications, adminReadApplication, getDraft, getMyApplication, listMyApplications, openDraft, saveDraft, submitApplication } from "./service";
import type { ApplicationErrorCode, ApplicationFailure, ApplicationResult, ApplicationsDependencies } from "./types";

export const MAX_BODY_BYTES = 40_000; // form cap is 32 KiB plus envelope

const MESSAGES: Record<ApplicationErrorCode, string> = {
  unavailable: "Applications are temporarily unavailable.", unauthenticated: "Sign in to continue.", forbidden: "You do not have access to this.",
  invalid_request: "Check the details and try again.", conflict: "This request conflicts with an earlier one. Reload before trying again.",
  stale: "This application changed. Reload before making another change.", closed: "This job is no longer accepting applications.",
  rate_limited: "Too many requests. Please wait before trying again.", outcome_unknown: "We could not confirm this. Check your application before trying again.",
  documents_missing: "Your CV, passport photo and valid ID must be uploaded and checked first.",
  documents_unsupported: "This job needs documents we cannot collect yet.", test_unavailable: "This job needs a test we cannot offer yet.",
  screening_incomplete: "Answer the required screening questions.",
};
const STATUS: Record<ApplicationErrorCode, number> = {
  unavailable: 503, unauthenticated: 401, forbidden: 403, invalid_request: 400, conflict: 409, stale: 409, closed: 409,
  rate_limited: 429, outcome_unknown: 503, documents_missing: 422, documents_unsupported: 422, test_unavailable: 422, screening_incomplete: 422,
};
const HEADERS = { "Cache-Control": "private, no-store" };

function failure(error: ApplicationFailure): Response {
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

type Action = (raw: unknown, deps: ApplicationsDependencies) => Promise<ApplicationResult<{ value: unknown }>>;
export const APPLICANT_ACTIONS: Record<string, Action> = {
  "draft-open": openDraft, "draft-get": getDraft, "draft-save": saveDraft, submit: submitApplication, list: listMyApplications, read: getMyApplication,
};
export const ADMIN_ACTIONS: Record<string, Action> = { list: adminListApplications, read: adminReadApplication };

export async function handleApplications(request: Request, action: string, actions: Record<string, Action>, deps: ApplicationsDependencies, origin: string): Promise<Response> {
  if (!deps.enabled) return failure({ ok: false, code: "unavailable" });
  if (request.method !== "POST" || !Object.hasOwn(actions, action)) return failure({ ok: false, code: "forbidden" });
  if (!origin || request.headers.get("origin") !== origin || new URL(request.url).origin !== origin || request.headers.get("sec-fetch-site") === "cross-site") return failure({ ok: false, code: "forbidden" });
  let raw: unknown;
  try { raw = await readJson(request); } catch { return failure({ ok: false, code: "invalid_request" }); }
  let result: ApplicationResult<{ value: unknown }>;
  try { result = await actions[action](raw, deps); } catch { return failure({ ok: false, code: "unavailable" }); }
  if (!result.ok) return failure(result);
  return Response.json({ ok: true, ...(result.value as object) }, { status: 200, headers: HEADERS });
}
