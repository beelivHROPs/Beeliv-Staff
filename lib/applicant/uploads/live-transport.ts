import type { UploadTransport } from "./transport";
import type { UploadCompleteResult, UploadFailure, UploadRequestInput, UploadRequestResult, UploadStatusResult, PutResult } from "./types";

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const CODES = new Set(["unavailable", "unauthenticated", "no_access", "invalid_request", "rate_limited", "conflict", "limit_reached", "expired", "outcome_unknown"]);
const MIME: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
const BASE = "/api/applicant/documents";

type Ports = { fetchImpl?: typeof fetch; createXhr?: () => XMLHttpRequest };
function record(v: unknown): v is Record<string, unknown> { return !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype; }
function extension(name: string): string | null { return /\.(pdf|jpg|jpeg|png)$/i.exec(name)?.[1].toLowerCase() ?? null; }
function validOrigin(value: string): boolean {
  try { const u = new URL(value); return u.origin === value && u.protocol === "https:" && /^[a-z0-9]+\.supabase\.co$/.test(u.hostname); } catch { return false; }
}

/** Rejects every host/path/query variant before bytes are sent. The token is never returned separately. */
export function signedUploadMime(raw: string, origin: string, uploadId?: string, fileName?: string): string | null {
  if (!validOrigin(origin)) return null;
  try {
    const u = new URL(raw);
    if (u.origin !== origin || u.username || u.password || u.port || u.hash || [...u.searchParams.keys()].length !== 1) return null;
    const token = u.searchParams.get("token");
    if (!token || token.length > 8192) return null;
    const match = /^\/storage\/v1\/object\/upload\/sign\/applicant-document-quarantine\/([a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\/source\.(pdf|jpg|jpeg|png)$/.exec(u.pathname);
    if (!match || (uploadId && match[1] !== uploadId.toLowerCase()) || (fileName && match[2] !== extension(fileName))) return null;
    return MIME[match[2]] ?? null;
  } catch { return null; }
}

function failure(value: Record<string, unknown>): UploadFailure | null {
  if (value.ok !== false || typeof value.code !== "string" || !CODES.has(value.code)) return null;
  const result: UploadFailure = { ok: false, code: value.code };
  if (typeof value.requestId === "string" && UUID.test(value.requestId)) result.requestId = value.requestId;
  return result;
}

/** A malformed or lost same-origin reply throws: the controller retains the original request ID. */
export function createLiveUploadTransport(storageOrigin: string, ports: Ports = {}): UploadTransport {
  const fetchImpl = ports.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  async function post(action: "request" | "complete" | "status", input: unknown): Promise<Record<string, unknown>> {
    const response = await fetchImpl(`${BASE}/${action}`, {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "content-type": "application/json" }, body: JSON.stringify(input),
    });
    const json: unknown = await response.json();
    if (!record(json) || typeof json.ok !== "boolean") throw new Error("upload_response_unconfirmed");
    return json;
  }
  return {
    async request(input: UploadRequestInput): Promise<UploadRequestResult> {
      const data = await post("request", input);
      const denied = failure(data);
      if (denied) return denied;
      if (data.ok !== true || !UUID.test(String(data.uploadId)) || data.status !== "awaiting-bytes" || typeof data.uploadUrl !== "string"
        || typeof data.uploadUrlExpiresAt !== "string" || typeof data.completeBefore !== "string" || typeof data.replayed !== "boolean"
        || !signedUploadMime(data.uploadUrl, storageOrigin, data.uploadId as string, input.fileName)) throw new Error("upload_response_unconfirmed");
      const expires = Date.parse(data.uploadUrlExpiresAt), complete = Date.parse(data.completeBefore);
      if (!Number.isFinite(expires) || !Number.isFinite(complete) || expires < complete || complete <= Date.now()) throw new Error("upload_response_unconfirmed");
      return { ok: true, uploadId: (data.uploadId as string).toLowerCase(), status: "awaiting-bytes", uploadUrl: data.uploadUrl,
        uploadUrlExpiresAt: data.uploadUrlExpiresAt, completeBefore: data.completeBefore, replayed: data.replayed };
    },
    putBytes(uploadUrl, file, onProgress, signal): Promise<PutResult> {
      const mime = signedUploadMime(uploadUrl, storageOrigin);
      if (!mime) return Promise.resolve({ ok: false, cause: "denied" });
      return new Promise(resolve => {
        let done = false;
        const xhr = ports.createXhr?.() ?? new XMLHttpRequest();
        const finish = (value: PutResult) => {
          if (done) return;
          done = true;
          signal?.removeEventListener("abort", abort);
          resolve(value);
        };
        const abort = () => xhr.abort();
        if (signal?.aborted) return finish({ ok: false, cause: "aborted" });
        xhr.open("PUT", uploadUrl, true);
        xhr.withCredentials = false;
        xhr.timeout = 120000;
        xhr.setRequestHeader("content-type", mime);
        xhr.upload.onprogress = event => { if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total); };
        xhr.onload = () => finish(xhr.status >= 200 && xhr.status < 300 ? { ok: true }
          : { ok: false, cause: xhr.status === 401 || xhr.status === 403 ? "expired" : "network" });
        xhr.onerror = () => finish({ ok: false, cause: typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "network" });
        xhr.ontimeout = () => finish({ ok: false, cause: "network" });
        xhr.onabort = () => finish({ ok: false, cause: "aborted" });
        signal?.addEventListener("abort", abort, { once: true });
        try { xhr.send(file); } catch { finish({ ok: false, cause: "network" }); }
      });
    },
    async complete(input): Promise<UploadCompleteResult> {
      const data = await post("complete", input);
      const denied = failure(data);
      if (denied) return denied;
      if (data.ok !== true || data.uploadId !== input.uploadId || data.status !== "checking" || typeof data.replayed !== "boolean") throw new Error("upload_response_unconfirmed");
      return { ok: true, uploadId: input.uploadId, status: "checking", replayed: data.replayed };
    },
    async status(input): Promise<UploadStatusResult> {
      const data = await post("status", input);
      const denied = failure(data);
      if (denied) return denied;
      if (data.ok !== true || data.uploadId !== input.uploadId || typeof data.status !== "string") throw new Error("upload_response_unconfirmed");
      if (data.status === "available") return { ok: true, uploadId: input.uploadId, status: "accepted" };
      if (data.status === "checking" || data.status === "rejected") return { ok: true, uploadId: input.uploadId, status: data.status };
      if (data.status === "expired") return { ok: false, code: "expired" };
      // "awaiting-bytes" after completion and any unknown status cannot prove readiness.
      throw new Error("upload_response_unconfirmed");
    },
  };
}
