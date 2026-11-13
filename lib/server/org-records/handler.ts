/** HTTP edge for the org records module: method, origin, content-type and body-size checks, then the service. */
import {
  assignPlacement, correctStaffEmail, createClient, createOutlet, createStaff, deactivateClient, deactivateOutlet, getClient, getStaff, listClients, listStaff, updateClient, updateOutlet, updateStaff,
} from "./service";
import type { OrgErrorCode, OrgFailure, OrgRecordsDependencies, OrgResult } from "./types";

export const MAX_BODY_BYTES = 12_000; // largest command is a few KB of bounded text

const MESSAGES: Record<OrgErrorCode, string> = {
  unavailable: "Records are temporarily unavailable.", unauthenticated: "Sign in to continue.", forbidden: "You do not have access to this.",
  not_found: "We could not find that record.", invalid_request: "Check the details and try again.",
  conflict: "This request conflicts with an earlier one. Reload before trying again.",
  stale: "Someone else just changed this. Look again before making another change.", duplicate: "That value is already in use.",
  inactive: "This record has been deactivated.", rate_limited: "Too many requests. Please wait before trying again.",
  outcome_unknown: "We could not confirm this. Check the record before trying again.",
};
const STATUS: Record<OrgErrorCode, number> = {
  unavailable: 503, unauthenticated: 401, forbidden: 403, not_found: 404, invalid_request: 400, conflict: 409, stale: 409, duplicate: 409,
  inactive: 409, rate_limited: 429, outcome_unknown: 503,
};
const HEADERS = { "Cache-Control": "private, no-store" };

function failure(error: OrgFailure): Response {
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

type Action = (raw: unknown, deps: OrgRecordsDependencies) => Promise<OrgResult<{ value: unknown }>>;
/** The whole public command surface. Anything else is refused as `forbidden`. */
export const ORG_ACTIONS: Record<string, Action> = {
  "client-list": listClients, "client-get": getClient, "client-create": createClient, "client-update": updateClient, "client-deactivate": deactivateClient,
  "outlet-create": createOutlet, "outlet-update": updateOutlet, "outlet-deactivate": deactivateOutlet,
  "staff-list": listStaff, "staff-get": getStaff, "staff-create": createStaff, "staff-update": updateStaff, "staff-correct-email": correctStaffEmail, "placement-assign": assignPlacement,
};

export async function handleOrgRecords(request: Request, action: string, actions: Record<string, Action>, deps: OrgRecordsDependencies, origin: string): Promise<Response> {
  if (!deps.enabled) return failure({ ok: false, code: "unavailable" });
  if (request.method !== "POST" || !Object.hasOwn(actions, action)) return failure({ ok: false, code: "forbidden" });
  if (!origin || request.headers.get("origin") !== origin || new URL(request.url).origin !== origin || request.headers.get("sec-fetch-site") === "cross-site") return failure({ ok: false, code: "forbidden" });
  let raw: unknown;
  try { raw = await readJson(request); } catch { return failure({ ok: false, code: "invalid_request" }); }
  let result: OrgResult<{ value: unknown }>;
  try { result = await actions[action](raw, deps); } catch { return failure({ ok: false, code: "unavailable" }); }
  if (!result.ok) return failure(result);
  return Response.json({ ok: true, value: result.value }, { status: 200, headers: HEADERS });
}
