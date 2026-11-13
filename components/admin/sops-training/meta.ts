/**
 * Display labels and links for SOPs, Training and Agreements. Staff-facing
 * status words match the Staff app (Assigned / In progress / Completed;
 * Agreements: accepted). Overdue and Needs re-acceptance are Admin-side views.
 * No rules here.
 */
import type { ChipTone } from "@/components/client/StatusChip";
import type { ContentAction, ContentKind, ContentStatus, TrackStatus } from "@/lib/admin/sops-training/types";

export const KINDS: ContentKind[] = ["sop", "training", "agreement"];

export const KIND_TAB_LABEL: Record<ContentKind, string> = { sop: "SOPs", training: "Training", agreement: "Agreements" };
export const KIND_ONE: Record<ContentKind, string> = { sop: "SOP", training: "Training course", agreement: "Agreement" };
/** Lower-case-safe wording for use inside a sentence. */
export const KIND_WORD: Record<ContentKind, string> = { sop: "SOP", training: "training course", agreement: "agreement" };
export const KIND_NEW: Record<ContentKind, string> = { sop: "New SOP", training: "New training", agreement: "New agreement" };

export const STATUS_ORDER: ContentStatus[] = ["draft", "published", "archived"];
export const STATUS_LABEL: Record<ContentStatus, string> = { draft: "Draft", published: "Published", archived: "Archived" };
export const STATUS_TONE: Record<ContentStatus, ChipTone> = { draft: "warn", published: "ok", archived: "mute" };

export const TRACK_LABEL: Record<TrackStatus, string> = {
  assigned: "Assigned",
  "in-progress": "In progress",
  completed: "Completed",
  overdue: "Overdue",
  pending: "Not accepted yet",
  accepted: "Accepted",
  reaccept: "Needs to accept again",
};
export const TRACK_TONE: Record<TrackStatus, ChipTone> = { assigned: "mute", "in-progress": "info", completed: "ok", overdue: "bad", pending: "mute", accepted: "ok", reaccept: "warn" };
export const TRACK_FILTERS: Record<ContentKind, TrackStatus[]> = {
  sop: ["assigned", "in-progress", "completed", "overdue"],
  training: ["assigned", "in-progress", "completed", "overdue"],
  agreement: ["pending", "accepted", "reaccept"],
};

export const ACTION_LABEL: Record<ContentAction, string> = { publish: "Publish", unpublish: "Unpublish", archive: "Archive", restore: "Restore as draft" };

/** Column and label wording per kind. */
export const REQUIRED_LABEL: Record<ContentKind, { on: string; off: string; field: string }> = {
  sop: { on: "Acknowledgement required", off: "Read only", field: "Staff must acknowledge this SOP" },
  training: { on: "Required", off: "Optional", field: "This training is required" },
  agreement: { on: "Must accept", off: "Optional", field: "Staff must accept this agreement" },
};
export const DONE_LABEL: Record<ContentKind, string> = { sop: "Completed", training: "Completed", agreement: "Accepted" };

const parse = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export function formatYmd(ymd: string): string {
  return ymd ? parse(ymd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).replace("Sept", "Sep") : "";
}
export function formatIso(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).replace("Sept", "Sep");
}
export function formatSize(bytes: number): string {
  return bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}
export function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ---------- links (defined here, inside this folder) ---------- */
export const CONTENT_BASE = "/admin/sops-training";
export const listHref = (kind?: ContentKind) => (kind && kind !== "sop" ? `${CONTENT_BASE}?tab=${kind}` : CONTENT_BASE);
export const contentHref = (id: string) => `${CONTENT_BASE}/${id}`;
export const contentEditHref = (id: string) => `${CONTENT_BASE}/${id}/edit`;
export const newContentHref = (kind: ContentKind) => `${CONTENT_BASE}/new?kind=${kind}`;
/** Staff 360 route: PLACEHOLDER contract (the Staff directory build owns the real path). */
export const staffHref = (staffId: string) => `/admin/staff/directory/${staffId}`;
