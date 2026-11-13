import { APPLICANT_ACTIONS, handleApplications } from "@/lib/server/applications/handler";
import { applicationsRuntime } from "@/lib/server/applications/runtime";

export const runtime = "nodejs";
/** Applicant draft/submit/status routes. Inert (503 unavailable) until every APPLICATIONS_* readiness flag is set. */
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await context.params;
    const { deps, origin } = applicationsRuntime("talent");
    return await handleApplications(request, action, APPLICANT_ACTIONS, deps, origin);
  } catch {
    return Response.json({ ok: false, error: { code: "unavailable", message: "Applications are temporarily unavailable." } }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
