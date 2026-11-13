import { createHash, createHmac, randomUUID } from "node:crypto";
import { validateEnquiry, ValidationError, type CleanEnquiry } from "./validation";

export type Receipt = { ok: true; reference: string } | { ok: false; code: "rate_limited" | "conflict"; retryAfterSeconds?: number };
export type Submission = CleanEnquiry & { idempotencyKey: string; payloadHash: string; subjectHash: string };
export type EnquiryDependencies = { origins: string[]; rateLimitSecret: string; save: (submission: Submission) => Promise<Receipt> };
const MAX_BYTES = 24000;
export async function readJson(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim();
  if (contentType !== "application/json") throw new Error("unsupported_type");
  if (Number(request.headers.get("content-length")) > MAX_BYTES) throw new Error("too_large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_json");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error("too_large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)); }
  catch { throw new Error("invalid_json"); }
}
export function apiFailure(status: number, code: string, message: string, supportRef: string, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, error: { code, message, supportRef, ...extra } }, { status, headers: { "Cache-Control": "no-store", ...(typeof extra.retryAfterSeconds === "number" ? { "Retry-After": String(extra.retryAfterSeconds) } : {}) } });
}
export async function handleEnquiry(request: Request, deps: EnquiryDependencies): Promise<Response> {
  const supportRef = randomUUID();
  const origin = request.headers.get("origin");
  if (!origin || !deps.origins.includes(origin) || request.headers.get("sec-fetch-site") === "cross-site") return apiFailure(403, "forbidden", "This request is not allowed.", supportRef);
  const key = request.headers.get("idempotency-key") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) return apiFailure(400, "validation_failed", "Refresh the form and try again.", supportRef);
  try {
    const clean = validateEnquiry(await readJson(request));
    const payloadHash = createHash("sha256").update(JSON.stringify({ kind: clean.kind, payload: clean.payload })).digest("hex");
    const subjectHash = createHmac("sha256", deps.rateLimitSecret).update(clean.email).digest("hex");
    const result = await deps.save({ ...clean, idempotencyKey: key, payloadHash, subjectHash });
    if (!result.ok) {
      if (result.code === "rate_limited") return apiFailure(429, "rate_limited", "Too many requests. Please wait before trying again.", supportRef, { retryAfterSeconds: result.retryAfterSeconds ?? 900 });
      return apiFailure(409, "conflict", "This submission changed. Refresh the form before sending it again.", supportRef);
    }
    return Response.json({ ok: true, reference: result.reference, notice: "Your enquiry has been saved for Beeliv to review." }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ValidationError) return apiFailure(422, "validation_failed", error.message, supportRef, { fields: error.fields });
    const reason = error instanceof Error ? error.message : "unavailable";
    if (reason === "too_large") return apiFailure(413, "payload_too_large", "This message is too large. Shorten it and try again.", supportRef);
    if (reason === "unsupported_type") return apiFailure(415, "unsupported_type", "Send the form using the website.", supportRef);
    if (reason === "invalid_json") return apiFailure(400, "invalid_request", "We could not read this request. Refresh and try again.", supportRef);
    // Correlate operational failures without logging personal details, payloads, credentials or raw upstream errors.
    console.error(JSON.stringify({ event: "public_enquiry_unconfirmed", supportRef }));
    return apiFailure(503, "unavailable", "We could not confirm that your enquiry was saved. Please retry; your details have been kept.", supportRef);
  }
}
