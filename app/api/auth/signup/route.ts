import { applicantSignup } from "@/lib/server/auth/signup";
import { enforceOrigin, AuthFailure } from "@/lib/server/auth/service";
import { RateFailure } from "@/lib/server/auth/rate";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export async function POST(request: Request) {
  try {
    enforceOrigin(request, "talent");
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new AuthFailure("invalid_request", 415);
    if (Number(request.headers.get("content-length")) > 4096) throw new AuthFailure("invalid_request", 413);
    const reader = request.body?.getReader();
    if (!reader) throw new AuthFailure("invalid_request");
    const chunks: Uint8Array[] = [];
    let size = 0;
    const deadline = Date.now() + 10000;
    try {
      for (;;) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const { done, value } = await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new AuthFailure("invalid_request", 408)), Math.max(1, deadline - Date.now())); }),
        ]).finally(() => clearTimeout(timer));
        if (done) break;
        size += value.byteLength;
        if (size > 4096) throw new AuthFailure("invalid_request", 413);
        chunks.push(value);
      }
    } finally { void reader.cancel().catch(() => undefined); }
    let input: unknown;
    try { input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { throw new AuthFailure("invalid_request"); }
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new AuthFailure("invalid_request");
    return Response.json(await applicantSignup(input as Record<string, unknown>), { headers });
  } catch (error) {
    const status = error instanceof RateFailure ? 429 : error instanceof AuthFailure ? error.status : 503;
    const reason = error instanceof RateFailure ? "rate_limited" : error instanceof AuthFailure ? error.code : "unavailable";
    const retry = error instanceof RateFailure || error instanceof AuthFailure ? error.retryAfterSeconds : undefined;
    return Response.json({ ok: false, reason, ...(retry ? { retryAfterSeconds: retry } : {}) }, { status, headers: { ...headers, ...(retry ? { "Retry-After": String(retry) } : {}) } });
  }
}
