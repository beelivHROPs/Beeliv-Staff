import { handleStaffEnrollment, STAFF_ENROLLMENT_ACTIONS } from "@/lib/server/staff-enrollment/handler";
import { staffEnrollmentRuntime } from "@/lib/server/staff-enrollment/runtime";

export const runtime = "nodejs";
/**
 * Staff (Talent session) personal details, employment and sensitive sections. Own record only: no action takes a person id.
 * Inert (503) until every STAFF_ENROLLMENT_* readiness flag is set; writes also need STAFF_ENROLLMENT_WRITES_ENABLED. POST only.
 */
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await context.params;
    const { deps, origin } = staffEnrollmentRuntime();
    return await handleStaffEnrollment(request, action, STAFF_ENROLLMENT_ACTIONS, deps, origin);
  } catch {
    return Response.json({ ok: false, error: { code: "unavailable", message: "This is temporarily unavailable." } }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
