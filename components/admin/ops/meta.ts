/** Labels, tones and link helpers for Operations approvals. Display only: transition rules live in the adapter. */
import type { ChipTone } from "@/components/client/StatusChip";
import type { ApprovalDecision, ApprovalKind, ApprovalStatus, ApprovalTab, DocumentState } from "@/lib/admin/ops/types";

export { formatIsoDate } from "@/components/admin/vacancies/meta";

export const OPS_HOME_HREF = "/admin/ops";
export const APPROVALS_HREF = "/admin/ops/approvals";
export const approvalHref = (id: string) => `${APPROVALS_HREF}/${id}`;
export const approvalsListHref = (params: { tab?: ApprovalTab; type?: ApprovalKind }) => {
  const sp = new URLSearchParams();
  if (params.tab && params.tab !== "waiting") sp.set("tab", params.tab);
  if (params.type) sp.set("type", params.type);
  const qs = sp.toString();
  return qs ? `${APPROVALS_HREF}?${qs}` : APPROVALS_HREF;
};
export const applicantRecordHref = (id: string) => `/admin/recruitment/applicants/${id}`;
export const offerRecordHref = (id: string) => `/admin/recruitment/offers/${id}`;

export const TAB_ORDER: ApprovalTab[] = ["waiting", "approved", "sent-back"];
export const TAB_LABEL: Record<ApprovalTab, string> = { waiting: "Waiting", approved: "Approved", "sent-back": "Sent back" };
export const isTab = (v: string): v is ApprovalTab => (TAB_ORDER as string[]).includes(v);
export const isKind = (v: string): v is ApprovalKind => v === "selection" || v === "offer";

export const KIND_LABEL: Record<ApprovalKind, string> = { selection: "Selection", offer: "Offer" };

export const STATUS_LABEL: Record<ApprovalStatus, string> = { waiting: "Waiting for you", approved: "Approved", "sent-back": "Sent back", rejected: "Rejected" };
export const STATUS_TONE: Record<ApprovalStatus, ChipTone> = { waiting: "warn", approved: "ok", "sent-back": "info", rejected: "bad" };

export const DECISION_PAST: Record<ApprovalDecision, string> = { approve: "Approved", "send-back": "Sent back", reject: "Rejected" };

export const DOC_LABEL: Record<DocumentState, string> = { verified: "Verified", pending: "Being checked", "requested-again": "Requested again", missing: "Not received" };
export const DOC_TONE: Record<DocumentState, ChipTone> = { verified: "ok", pending: "warn", "requested-again": "warn", missing: "bad" };

/** Whole days between an ISO time and now, for "Waiting 3 days". */
export function waitingText(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "Waiting since today";
  return `Waiting ${days} ${days === 1 ? "day" : "days"}`;
}
