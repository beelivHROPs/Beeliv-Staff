/** Display labels, formatters and links for Announcements. No rules here (the backend decides scheduling and expiry). */
import type { ChipTone } from "@/components/client/StatusChip";
import type { AnnouncementAction, AnnouncementStatus, ReceiptStatus } from "@/lib/admin/announcements/types";

export const STATUS_ORDER: AnnouncementStatus[] = ["draft", "scheduled", "published", "expired"];
export const STATUS_LABEL: Record<AnnouncementStatus, string> = { draft: "Draft", scheduled: "Scheduled", published: "Published", expired: "Expired" };
export const STATUS_TONE: Record<AnnouncementStatus, ChipTone> = { draft: "warn", scheduled: "info", published: "ok", expired: "mute" };

export const RECEIPT_LABEL: Record<ReceiptStatus, string> = { acknowledged: "Acknowledged", read: "Read", unread: "Not read yet" };
export const RECEIPT_TONE: Record<ReceiptStatus, ChipTone> = { acknowledged: "ok", read: "info", unread: "mute" };

export function actionLabel(action: AnnouncementAction, status: AnnouncementStatus): string {
  if (action === "publish") return "Publish";
  if (action === "end") return "End now";
  return status === "expired" ? "Reuse as draft" : status === "scheduled" ? "Cancel schedule" : "Unpublish";
}

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
export function formatIsoTime(iso: string): string {
  return `${formatIso(iso)}, ${new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}
export function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const ANN_BASE = "/admin/announcements";
export const announcementHref = (id: string) => `${ANN_BASE}/${id}`;
export const announcementEditHref = (id: string) => `${ANN_BASE}/${id}/edit`;
export const NEW_ANNOUNCEMENT_HREF = `${ANN_BASE}/new`;
/** Staff 360 route: PLACEHOLDER contract (the Staff directory build owns the real path). */
export const staffHref = (staffId: string) => `/admin/staff/directory/${staffId}`;
