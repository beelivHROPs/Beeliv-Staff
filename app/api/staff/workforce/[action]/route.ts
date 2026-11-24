import { readJson } from "@/lib/server/public-enquiries/handler";
import { AuthFailure, enforceOrigin } from "@/lib/server/auth/service";
import { RateFailure } from "@/lib/server/auth/rate";
import { workforceStaff } from "@/lib/server/workforce/service";

export const runtime = "nodejs";
const HEADERS = { "Cache-Control": "private, no-store" };

/** Scheduling + attendance (talent). Same-origin JSON only; the database re-checks permission, scope and state. */
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await context.params;
    enforceOrigin(request, "talent");
    const input = await readJson(request);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new AuthFailure("invalid_request");
    return Response.json(await workforceStaff(action, input as Record<string, unknown>), { headers: HEADERS });
  } catch (error) {
    const f = error instanceof AuthFailure ? error : error instanceof RateFailure ? new AuthFailure("rate_limited", 429) : new AuthFailure("unavailable", 503);
    return Response.json({ ok: false, reason: f.code }, { status: f.status, headers: HEADERS });
  }
}
