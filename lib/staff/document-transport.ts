import type { StaffDocument, DocumentStatus } from "./types";
import type { OwnChecklistDto, OwnSlotDto, UploadGrant } from "../server/staff-documentation/types";

const STATES: Record<OwnSlotDto["state"], DocumentStatus> = {
  requested: "required", checking: "under-review", available: "under-review", verified: "verified",
  "update-required": "update-required", rejected: "update-required", expired: "expired",
};
const SLOTS = new Set(["passport-photo", "nin-copy", "medical-fitness"]);

async function call<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`/api/staff/documentation/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(30000),
  });
  const reply = await response.json();
  if (!response.ok || reply?.ok !== true || !reply.value) throw new Error("Documents are temporarily unavailable. Refresh before trying again.");
  return reply.value as T;
}

export async function getLiveStaffDocuments(): Promise<StaffDocument[]> {
  const checklist = await call<OwnChecklistDto>("checklist-get");
  if (!Array.isArray(checklist.items)) throw new Error("Documents are temporarily unavailable.");
  return checklist.items.map(item => {
    if (!SLOTS.has(item.slot) || !Object.hasOwn(STATES, item.state) || typeof item.label !== "string") throw new Error("Documents are temporarily unavailable.");
    return {
      id: item.slot, name: item.label, group: item.slot === "medical-fitness" ? "certificates" : "identity",
      status: STATES[item.state], dueDate: item.current?.expiresOn ?? null, fileName: null,
      hasCurrentFile: item.current !== null, uploadPending: item.incoming?.status === "checking" || item.incoming?.status === "awaiting-bytes",
      updatedAt: item.current?.uploadedAt ?? null, requestNote: item.current?.message ?? null,
    };
  });
}

/** No person/path/review fields go to the server. The session determines the owner. */
export async function sendLiveStaffDocument(slot: string, file: File): Promise<StaffDocument> {
  if (!SLOTS.has(slot) || file.size < 1 || file.size > 5000000) throw new Error("Choose a file up to 5 MB.");
  const requestId = crypto.randomUUID();
  const grant = await call<UploadGrant>("slot-request", { requestId, slot, fileName: file.name, size: file.size, contentType: file.type });
  const url = new URL(grant.uploadUrl);
  const id = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
  if (!id.test(grant.uploadId) || url.origin !== "https://lrkeihyqeuuxscmjxtqn.supabase.co" || url.username || url.password || url.hash ||
      !["pdf", "jpg", "jpeg", "png"].some(ext => url.pathname === `/storage/v1/object/upload/sign/staff-document-quarantine/${grant.uploadId}/source.${ext}`) ||
      !url.searchParams.get("token") || [...url.searchParams.keys()].some(key => key !== "token") ||
      !Number.isFinite(Date.parse(grant.uploadUrlExpiresAt)) || Date.parse(grant.uploadUrlExpiresAt) <= Date.now()) throw new Error("Upload is temporarily unavailable.");
  const upload = await fetch(url, {
    method: "PUT", body: file, headers: { "Content-Type": file.type, "x-upsert": "false" },
    credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", signal: AbortSignal.timeout(120000),
  });
  if (!upload.ok) throw new Error("We could not confirm the upload. Refresh your documents before trying again.");
  await call("complete", { requestId: crypto.randomUUID(), uploadId: grant.uploadId });
  const result = (await getLiveStaffDocuments()).find(item => item.id === slot);
  if (!result) throw new Error("Refresh your documents to check the upload.");
  return result;
}
