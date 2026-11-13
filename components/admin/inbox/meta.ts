import type { EmailDeliveryState, InboxCaseCategory, InboxStatus, NeedsHomeReason, RelatedKind, SenderKind } from "@/lib/admin/inbox/types";

export const CATEGORY_LABEL: Record<InboxCaseCategory, string> = {
  "training-enquiry": "Training enquiry",
  "staff-support": "Staff support",
  "client-support": "Client support",
  "workforce-request": "Workforce request",
  "candidate-feedback": "Candidate feedback",
  "applicant-documents": "Applicant documents",
  "technical-account": "Technical / account",
  "cant-attend": "Can't attend",
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_LABEL) as InboxCaseCategory[];

export const STATUS_LABEL: Record<InboxStatus, string> = {
  new: "New",
  open: "Open",
  "waiting-on-sender": "Waiting on sender",
  escalated: "Escalated",
  resolved: "Resolved",
};

export const STATUS_ORDER = Object.keys(STATUS_LABEL) as InboxStatus[];

/** Pending states are yellow (project rule); resolved green; new / open brand. */
export const STATUS_CHIP: Record<InboxStatus, "warn" | "ok" | "info" | "violet" | "mute"> = {
  new: "violet",
  open: "info",
  "waiting-on-sender": "warn",
  escalated: "warn",
  resolved: "ok",
};

export const SENDER_KIND_LABEL: Record<SenderKind, string> = {
  applicant: "Applicant",
  staff: "Staff",
  client: "Client",
  public: "External enquirer",
};

export const RELATED_LABEL: Record<RelatedKind, string> = {
  applicant: "Applicant",
  staff: "Staff",
  client: "Client",
  "workforce-request": "Workforce request",
  interview: "Interview",
};

/** Spec 31.2 "Oversight / escalation" column, per category. Wording of "as configured" needs Beeliv confirmation. */
export const ESCALATION_TARGET: Record<InboxCaseCategory, string> = {
  "training-enquiry": "HR Manager / Head of Operations (as configured)",
  "staff-support": "Head of Operations",
  "client-support": "Head of Operations",
  "workforce-request": "Head of Operations / Management",
  "candidate-feedback": "HR Manager / Head of Operations",
  "applicant-documents": "HR Manager",
  "technical-account": "Head of Operations (where business-impacting)",
  "cant-attend": "HR Manager",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** WhatsApp-style list stamp: time today, "Yesterday", otherwise a short date. */
export function listStamp(iso: string, now = Date.now()): string {
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(new Date(iso))) / 86_400_000);
  const d = new Date(iso);
  if (days <= 0) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Date separator label between days in a thread. */
export function dayLabel(iso: string, now = Date.now()): string {
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(new Date(iso))) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export const dayKey = (iso: string) => String(startOfDay(new Date(iso)));
export const clockTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/* ---------- email delivery (docs/contracts/inbox-email.md) ---------- */

/** Quiet word + dot colour per state. Wording is a PROPOSAL (needs Beeliv confirmation). */
export const DELIVERY_LABEL: Record<EmailDeliveryState, string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed",
  bounced: "Bounced",
  complained: "Blocked",
  unknown: "Not confirmed",
};

export const DELIVERY_DOT: Record<EmailDeliveryState, string> = {
  queued: "bg-(--ap-faint)",
  sent: "bg-(--ap-faint)",
  delivered: "bg-(--ap-ok)",
  failed: "bg-(--ap-rose)",
  bounced: "bg-(--ap-rose)",
  complained: "bg-(--ap-rose)",
  unknown: "bg-(--ap-warn)",
};

/** One plain line, shown only for the states that need the reader's attention. */
export const DELIVERY_EXPLAIN: Partial<Record<EmailDeliveryState, string>> = {
  failed: "The email did not go out. You can try again.",
  bounced: "That address could not receive the email. Check the address on the case.",
  complained: "The recipient reported an earlier email as unwanted. We no longer email this address.",
  unknown: "We could not confirm it was sent. Nothing was resent.",
};

/** Why the reply composer is switched off (honest, one sentence). */
export const NO_EMAIL_NOTE = {
  "no-email": "This request has no email address, so a reply cannot be emailed. You can still add an internal note.",
  "in-app-only": "Replies to staff stay in the app and are not emailed. You can still add an internal note.",
  suppressed: "We no longer email this address because the recipient reported an earlier email as unwanted. You can still add an internal note.",
} as const;

export const NEEDS_HOME_REASON: Record<NeedsHomeReason, string> = {
  "no-case-address": "Sent to a general address, not a case",
  "case-not-found": "The case it replies to could not be found",
  "sender-differs": "Sent from an address that is not on the case",
};
