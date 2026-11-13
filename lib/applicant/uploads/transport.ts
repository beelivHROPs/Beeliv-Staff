/**
 * The seam between the Applicant UI and whatever eventually carries uploads.
 * No HTTP route or path is final (UPLOADS-003), so the UI never names one: it asks an
 * injected UploadTransport. Three implementations exist today:
 *   - createUnavailableTransport(): the default outside preview mode. Every request says "unavailable".
 *   - mock-transport.ts: deterministic, switchable outcomes for the prototype and the tests.
 *   - createHttpTransport(routes): a thin fetch/XHR wrapper to be given real routes by the integrator.
 *
 * Contract for implementers:
 *   - request() and complete() RETURN the service's JSON ({ok:true,...} or {ok:false,code,...}).
 *     They THROW when the reply is lost (offline, timeout, unreadable body): the caller then treats
 *     the outcome as unknown and keeps the original ids.
 *   - putBytes() never throws; it resolves with a PutResult.
 *   - The uploadUrl is a credential. Do not log it, store it, or put it in analytics.
 */
import type { PutResult, UploadCompleteInput, UploadCompleteResult, UploadRequestInput, UploadRequestResult, UploadStatusResult } from "./types";

export interface UploadTransport {
  request(input: UploadRequestInput): Promise<UploadRequestResult>;
  putBytes(uploadUrl: string, file: Blob, onProgress: (fraction: number) => void, signal?: AbortSignal): Promise<PutResult>;
  complete(input: UploadCompleteInput): Promise<UploadCompleteResult>;
  /** PROPOSED (needs Codex): read one upload's server state. Optional; without it a file stays "checking". */
  status?(input: { uploadId: string }): Promise<UploadStatusResult>;
}

/** Honest default: nothing can be uploaded, and the UI says so. */
export function createUnavailableTransport(): UploadTransport {
  return {
    async request() {
      return { ok: false, code: "unavailable" };
    },
    async putBytes() {
      return { ok: false, cause: "denied" };
    },
    async complete() {
      return { ok: false, code: "unavailable" };
    },
  };
}

/* ------------------------------------------------------------------ */
/* Optional real HTTP transport (routes are injected, never defaulted)  */
/* ------------------------------------------------------------------ */

export interface HttpTransportConfig {
  /** Same-origin paths the integrator was given. Required: there is no default. */
  routes: { request: string; complete: string; status?: string };
  /**
   * Hosts a signed upload URL may point to, exact match (for example the project's
   * "<ref>.supabase.co"). Anything else is refused before a single byte is sent.
   */
  allowedUploadHosts: readonly string[];
  fetchImpl?: typeof fetch;
  /** How the file becomes a request body. Default: the raw file with its own type. Needs Codex to confirm. */
  buildBody?: (file: Blob) => { body: XMLHttpRequestBodyInit; headers?: Record<string, string> };
  /** Test seam: build the XHR. */
  createXhr?: () => XMLHttpRequest;
}

/** https only, exact allowed host, no credentials in the URL, no surprise port. */
export function isAllowedUploadUrl(raw: string, allowedHosts: readonly string[]): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password && url.port === "" && allowedHosts.includes(url.hostname);
  } catch {
    return false;
  }
}

async function postJson<T>(fetchImpl: typeof fetch, path: string, body: unknown): Promise<T> {
  // A thrown fetch (network down) or an unreadable body both mean "we do not know"; the caller handles the throw.
  const res = await fetchImpl(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  const json = (await res.json()) as T;
  if (!json || typeof json !== "object" || typeof (json as { ok?: unknown }).ok !== "boolean") throw new Error("unreadable reply");
  return json;
}

export function createHttpTransport(config: HttpTransportConfig): UploadTransport {
  const f = config.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const transport: UploadTransport = {
    request: (input) => postJson<UploadRequestResult>(f, config.routes.request, input),
    complete: (input) => postJson<UploadCompleteResult>(f, config.routes.complete, input),
    putBytes(uploadUrl, file, onProgress, signal) {
      if (!isAllowedUploadUrl(uploadUrl, config.allowedUploadHosts)) return Promise.resolve({ ok: false, cause: "denied" });
      return new Promise<PutResult>((resolve) => {
        const xhr = config.createXhr ? config.createXhr() : new XMLHttpRequest();
        const { body, headers } = config.buildBody ? config.buildBody(file) : { body: file, headers: { "content-type": file.type || "application/octet-stream" } };
        xhr.open("PUT", uploadUrl);
        for (const [k, v] of Object.entries(headers ?? {})) xhr.setRequestHeader(k, v);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve({ ok: true });
          else if (xhr.status === 401 || xhr.status === 403) resolve({ ok: false, cause: "expired" });
          else resolve({ ok: false, cause: "network" });
        };
        xhr.onerror = () => resolve({ ok: false, cause: typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "network" });
        xhr.ontimeout = () => resolve({ ok: false, cause: "network" });
        xhr.onabort = () => resolve({ ok: false, cause: "aborted" });
        signal?.addEventListener("abort", () => xhr.abort(), { once: true });
        if (signal?.aborted) return resolve({ ok: false, cause: "aborted" });
        xhr.send(body);
      });
    },
  };
  if (config.routes.status) {
    const statusRoute = config.routes.status;
    transport.status = (input) => postJson<UploadStatusResult>(f, statusRoute, input);
  }
  return transport;
}
