import { ADMIN_ACTIONS, handleApplications } from "@/lib/server/applications/handler";
import { applicationsRuntime } from "@/lib/server/applications/runtime";

export const runtime = "nodejs";
/** Scoped Admin application list/detail. Inert until the APPLICATIONS_* flags AND APPLICATIONS_ADMIN_READS_ENABLED are set. */
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await context.params;
    const { deps, origin } = applicationsRuntime("admin");
    return await handleApplications(request, action, ADMIN_ACTIONS, deps, origin);
  } catch {
    return Response.json({ ok: false, error: { code: "unavailable", message: "Applications are temporarily unavailable." } }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
