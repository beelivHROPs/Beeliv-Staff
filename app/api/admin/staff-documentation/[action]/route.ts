import { handleStaffDocumentation, STAFF_DOC_HR_ACTIONS } from "@/lib/server/staff-documentation/handler";
import { staffDocumentationRuntime } from "@/lib/server/staff-documentation/runtime";

export const runtime = "nodejs";
/**
 * Admin (HR, Operations) scoped Staff document review: queue, open (audited), decide, completion. Scope and capability are decided in SQL.
 * Inert (503) until every STAFF_DOCUMENTATION_* readiness flag is set; writes also need STAFF_DOCUMENTATION_WRITES_ENABLED. POST only.
 */
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await context.params;
    const { deps, origin } = staffDocumentationRuntime("admin");
    return await handleStaffDocumentation(request, action, STAFF_DOC_HR_ACTIONS, deps, origin);
  } catch {
    return Response.json({ ok: false, error: { code: "unavailable", message: "This is temporarily unavailable." } }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
