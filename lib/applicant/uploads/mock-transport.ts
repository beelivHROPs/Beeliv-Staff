/**
 * PROTOTYPE / TEST ONLY. A deterministic stand-in for the real upload service, with switchable
 * outcomes so every UI state can be seen and tested. It stores nothing and sends nothing: the
 * "upload URL" is a made-up address that is never fetched. It copies the real service's
 * important behaviour: the same requestId always maps to the same uploadId and reports
 * replayed:true on the second call, which is what makes "retry with the original ids" testable.
 */
import type { UploadTransport } from "./transport";
import type { PutResult, UploadCompleteResult, UploadRequestInput, UploadRequestResult, UploadSlot, UploadStatusResult } from "./types";

export const MOCK_SCENARIOS = [
  "ok", // request, send, complete; stays "checking" (no status read)
  "checked", // like ok, then the status read says the file passed checks
  "stall", // stops at 45% until cancelled
  "hold-request", // the request never answers until cancelled
  "hold-complete", // bytes are sent, then the complete call never answers
  "reject-type", // the server refuses the type
  "reject-size", // the server refuses the size
  "denied", // no_access
  "limit", // limit_reached
  "rate-limited", // too many uploads
  "unavailable", // the service says unavailable
  "signed-out", // unauthenticated
  "put-network", // sending bytes fails once (network), then works
  "put-offline", // sending bytes fails once (offline), then works
  "put-expired", // the signed URL no longer works
  "request-unknown", // the request reaches the server but the reply is lost; a retry replays
  "complete-unknown", // the complete call reaches the server but the reply is lost; a retry replays
  "expired", // complete says the time window passed
  "scan-rejected", // complete ok, then the status read says the scan refused it
] as const;

export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export function isMockScenario(v: unknown): v is MockScenario {
  return typeof v === "string" && (MOCK_SCENARIOS as readonly string[]).includes(v);
}

export interface MockOptions {
  /** One scenario for all slots, or a choice per slot. May be changed later with setScenario. */
  scenario?: MockScenario | Partial<Record<UploadSlot, MockScenario>>;
  /** Milliseconds per simulated step. 0 in tests. */
  stepMs?: number;
  /** Test seam. */
  wait?: (ms: number) => Promise<void>;
  newId?: () => string;
}

export interface MockTransport extends UploadTransport {
  setScenario(s: MockOptions["scenario"]): void;
  /** What the "server" saw, for assertions. Never contains bytes. */
  readonly log: { requests: UploadRequestInput[]; completes: { requestId: string; uploadId: string }[]; puts: number };
}

export function createMockTransport(options: MockOptions = {}): MockTransport {
  let scenario: MockOptions["scenario"] = options.scenario ?? "ok";
  const stepMs = options.stepMs ?? 450;
  const wait = options.wait ?? ((ms) => (ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve()));
  let counter = 0;
  const newId = options.newId ?? (() => `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`);

  const byRequest = new Map<string, { uploadId: string; scenario: MockScenario; input: UploadRequestInput }>();
  const scenarioByUpload = new Map<string, MockScenario>();
  const lostOnce = new Set<string>();
  const polls = new Map<string, number>();
  let putFailed = false;
  const log: MockTransport["log"] = { requests: [], completes: [], puts: 0 };

  const pick = (slot: UploadSlot): MockScenario => (typeof scenario === "string" ? scenario : scenario?.[slot] ?? "ok");
  const never = () => new Promise<never>(() => undefined);
  const fail = (code: string, extra: object = {}) => ({ ok: false as const, code, ...extra });

  return {
    log,
    setScenario(s) {
      scenario = s ?? "ok";
    },

    async request(input): Promise<UploadRequestResult> {
      log.requests.push({ ...input });
      await wait(stepMs);
      const known = byRequest.get(input.requestId);
      const sc = known?.scenario ?? pick(input.purpose);
      if (sc === "hold-request") return never();
      if (!known) {
        if (sc === "reject-type") return fail("invalid_request", { fields: { fileName: "Check this upload value.", contentType: "Check this upload value." } });
        if (sc === "reject-size") return fail("invalid_request", { fields: { size: "Check this upload value." } });
        if (sc === "denied") return fail("no_access");
        if (sc === "limit") return fail("limit_reached");
        if (sc === "rate-limited") return fail("rate_limited", { retryAfterSeconds: 60 });
        if (sc === "unavailable") return fail("unavailable");
        if (sc === "signed-out") return fail("unauthenticated");
      }
      if (known && JSON.stringify(known.input) !== JSON.stringify(input)) return fail("conflict");
      const uploadId = known?.uploadId ?? newId();
      if (!known) {
        byRequest.set(input.requestId, { uploadId, scenario: sc, input: { ...input } });
        scenarioByUpload.set(uploadId, sc);
      }
      if (sc === "request-unknown" && !lostOnce.has(`r:${input.requestId}`)) {
        lostOnce.add(`r:${input.requestId}`);
        throw new Error("lost reply");
      }
      const now = Date.now();
      return {
        ok: true,
        uploadId,
        status: "awaiting-bytes",
        uploadUrl: `https://mock.invalid/upload/${uploadId}`,
        uploadUrlExpiresAt: new Date(now + 2 * 3600_000).toISOString(),
        completeBefore: new Date(now + 30 * 60_000).toISOString(),
        replayed: !!known,
      };
    },

    async putBytes(uploadUrl, _file, onProgress, signal): Promise<PutResult> {
      log.puts += 1;
      const uploadId = uploadUrl.split("/").pop() ?? "";
      const sc = scenarioByUpload.get(uploadId) ?? "ok";
      const aborted = () => ({ ok: false as const, cause: "aborted" as const });
      if (signal?.aborted) return aborted();
      if (sc === "stall") {
        onProgress(0.45);
        return new Promise<PutResult>((resolve) => signal?.addEventListener("abort", () => resolve(aborted()), { once: true }));
      }
      for (const f of [0.2, 0.55, 0.85]) {
        await wait(stepMs);
        if (signal?.aborted) return aborted();
        onProgress(f);
        if (!putFailed && f === 0.55 && (sc === "put-network" || sc === "put-offline")) {
          putFailed = true;
          return { ok: false, cause: sc === "put-offline" ? "offline" : "network" };
        }
        if (sc === "put-expired" && f === 0.55) return { ok: false, cause: "expired" };
      }
      onProgress(1);
      return { ok: true };
    },

    async complete(input): Promise<UploadCompleteResult> {
      log.completes.push({ ...input });
      await wait(stepMs);
      const rec = byRequest.get(input.requestId);
      if (!rec || rec.uploadId !== input.uploadId) return fail("invalid_request");
      if (rec.scenario === "hold-complete") return never();
      if (rec.scenario === "expired") return fail("expired");
      const replayed = lostOnce.has(`c:${input.requestId}`);
      if (rec.scenario === "complete-unknown" && !replayed) {
        lostOnce.add(`c:${input.requestId}`);
        throw new Error("lost reply");
      }
      return { ok: true, uploadId: rec.uploadId, status: "checking", replayed };
    },

    async status({ uploadId }): Promise<UploadStatusResult> {
      await wait(stepMs);
      const sc = scenarioByUpload.get(uploadId) ?? "ok";
      const n = (polls.get(uploadId) ?? 0) + 1;
      polls.set(uploadId, n);
      if (sc === "scan-rejected" && n >= 1) return { ok: true, uploadId, status: "rejected" };
      if (sc === "checked" && n >= 2) return { ok: true, uploadId, status: "accepted" };
      return { ok: true, uploadId, status: "checking" };
    },
  };
}
