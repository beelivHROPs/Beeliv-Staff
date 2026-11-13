import { passwordRecovery } from "@/lib/server/auth/recovery";
import { enforceOrigin, requestedApp, AuthFailure } from "@/lib/server/auth/service";
import { RateFailure } from "@/lib/server/auth/rate";
export const runtime = "nodejs";
const headers = {"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"};
export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AuthFailure("invalid_request",415);
    const reader = request.body?.getReader();
    if (!reader) throw new AuthFailure("invalid_request");
    const chunks: Uint8Array[] = []; let size=0;
    try { for (;;) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>4096) throw new AuthFailure("invalid_request",413); chunks.push(value); } }
    finally { await reader.cancel().catch(()=>undefined); }
    let input: Record<string,unknown>;
    try { input=JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new AuthFailure("invalid_request"); }
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new AuthFailure("invalid_request");
    enforceOrigin(request,requestedApp(input));
    return Response.json(await passwordRecovery(input),{headers});
  } catch(error) {
    const status=error instanceof RateFailure ? 429 : error instanceof AuthFailure ? error.status : 503;
    const reason=error instanceof RateFailure ? "rate_limited" : error instanceof AuthFailure ? error.code : "unavailable";
    const retry=error instanceof RateFailure ? error.retryAfterSeconds : undefined;
    return Response.json({ok:false,reason,retryAfterSeconds:retry},{status,headers:{...headers,...(retry ? {"Retry-After":String(retry)} : {})}});
  }
}
