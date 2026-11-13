import { handleStaffDocumentation, STAFF_DOC_OWN_ACTIONS } from "@/lib/server/staff-documentation/handler";
import { staffDocumentationRuntime } from "@/lib/server/staff-documentation/runtime";

export const runtime = "nodejs";
/**
 * Staff (Talent session) OWN documents: checklist, upload request, complete, upload status. Own record only: no action takes a person id.
 * Inert (503) until every STAFF_DOCUMENTATION_* readiness flag is set; writes also need STAFF_DOCUMENTATION_WRITES_ENABLED. POST only.
 */
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await context.params;
    const { deps, origin } = staffDocumentationRuntime("talent");
    return await handleStaffDocumentation(request, action, STAFF_DOC_OWN_ACTIONS, deps, origin);
  } catch {
    return Response.json({ ok: false, error: { code: "unavailable", message: "This is temporarily unavailable." } }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
