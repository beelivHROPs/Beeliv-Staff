import { handleOrgRecords, ORG_ACTIONS } from "@/lib/server/org-records/handler";
import { orgRecordsRuntime } from "@/lib/server/org-records/runtime";

export const runtime = "nodejs";
/** Clients, Outlets, Staff records and Placements for Admin. Inert (503) until the ORG_RECORDS_* flags are set; writes also need ORG_RECORDS_WRITES_ENABLED. */
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await context.params;
    const { deps, origin } = orgRecordsRuntime();
    return await handleOrgRecords(request, action, ORG_ACTIONS, deps, origin);
  } catch {
    return Response.json({ ok: false, error: { code: "unavailable", message: "Records are temporarily unavailable." } }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
