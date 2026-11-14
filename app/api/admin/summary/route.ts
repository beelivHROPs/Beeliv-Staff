import { adminSummaryRuntime } from "@/lib/server/admin-summary/runtime";
import { handleAdminSummary, summaryFailure } from "@/lib/server/admin-summary/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const { deps, origin } = adminSummaryRuntime();
    return await handleAdminSummary(request, deps, origin);
  } catch { return summaryFailure("unavailable"); }
}

