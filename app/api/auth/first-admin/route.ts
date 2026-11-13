import { acceptFirstAdmin, FirstAdminFailure } from "@/lib/server/auth/first-admin";
import { enforceOrigin } from "@/lib/server/auth/service";
import { RateFailure } from "@/lib/server/auth/rate";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
export async function POST(request: Request) {
  try {
    enforceOrigin(request, "admin");
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json" || Number(request.headers.get("content-length")) > 4096) throw new FirstAdminFailure();
    const reader = request.body?.getReader();
    if (!reader) throw new FirstAdminFailure();
    let size = 0; const parts: Uint8Array[] = [];
    try {
      for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 4096) { await reader.cancel(); throw new FirstAdminFailure(); } parts.push(value); }
    } finally { reader.releaseLock(); }
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts)));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new FirstAdminFailure();
    return Response.json(await acceptFirstAdmin(body), { headers });
  } catch (error) {
    const rate = error instanceof RateFailure;
    return Response.json({ ok: false, message: rate ? "Too many attempts. Please wait before trying again." : "We couldn't complete setup. Check the link and separate code. If you already created a password, use that same password." },
      { status: rate ? 429 : error instanceof FirstAdminFailure ? error.status : 503, headers: { ...headers, ...(rate ? { "Retry-After": String(error.retryAfterSeconds) } : {}) } });
  }
}
