import { requestApplicantDocumentScan } from "@/lib/server/scan-dispatch";
import { handlePrivateDocument } from "@/lib/server/private-documents/handler";
import { privateDocumentRuntime } from "@/lib/server/private-documents/runtime";
import { requestPrivateUpload } from "@/lib/server/private-documents/request-service";
import { completePrivateUpload } from "@/lib/server/private-documents/completion-service";
import { getPrivateUploadStatus } from "@/lib/server/private-documents/status-service";

export const runtime = "nodejs";
/**
 * Applicant (Talent session, applicant entitlement) OWN private uploads: request (signed upload slot), complete
 * (queue for scanning), status. Own uploads only; no action takes a person id. Inert (503) until every
 * PRIVATE_DOCUMENTS_* readiness flag is set (lib/server/private-documents/runtime.ts). POST only.
 */
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await context.params;
    const rt = privateDocumentRuntime();
    return await handlePrivateDocument(request, action, {
      enabled: rt.request.enabled,
      origin: rt.origin,
      actions: {
        request: (input) => requestPrivateUpload(input, rt.request),
        complete: async (input) => {
          const result = await completePrivateUpload(input, rt.completion);
          // Only signal after the authorized durable queue write. A failed nudge
          // must never undo a committed upload; the scheduled run is the fallback.
          if (result.ok) await requestApplicantDocumentScan().catch(() => false);
          return result;
        },
        status: (input) => getPrivateUploadStatus(input, rt.status),
      },
    });
  } catch {
    return Response.json({ ok: false, error: { code: "unavailable" } }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
