/**
 * Small adapters from each app's older notification shape to the shared one
 * (./types.ts). They only RENAME and DERIVE fields; screens keep using their
 * own shapes and look exactly as before. A real backend returns the shared
 * shape directly and these adapters are deleted.
 */
import type { AdminNotification } from "@/lib/admin/types";
import type { AppNotification, NotificationKind as ApplicantKind } from "@/lib/applicant/types";
import type { ClientNotification } from "@/lib/client/types";
import type { Notification as StaffNotification, NotificationEvent } from "@/lib/staff/types";
import { eventFor, type EventCode } from "./catalog";
import type { SharedNotification } from "./types";

function build(kind: EventCode, base: { id: string; title: string; body: string; createdAt: string; read: boolean; href: string | null }): SharedNotification {
  const def = eventFor(kind);
  return {
    id: base.id,
    kind,
    title: base.title,
    body: base.body,
    createdAt: base.createdAt,
    // The mocks keep only read / unread, so the creation time stands in for the read time.
    readAt: base.read ? base.createdAt : null,
    href: base.href,
    required: def.required,
    channels: def.channels,
    severity: def.severity,
  };
}

/* ---------------------------- Applicant ---------------------------- */

const APPLICANT_KIND: Record<ApplicantKind, EventCode> = {
  "application-received": "application.received",
  shortlisted: "application.status_changed",
  "interview-invitation": "interview.scheduled",
  "interview-reminder": "interview.reminder",
  "document-request": "document.requested",
  "documentation-reminder": "document.reminder",
  "documents-verified": "document.verified",
  "client-approval": "client.approval",
  offer: "offer.sent",
  placement: "placement.confirmed",
  "resumption-date": "resumption.date",
  "not-selected": "application.not_selected",
  "talent-pool": "talent_pool.notice",
};

/**
 * Applicant notifications raised by this change (interview changed or cancelled)
 * carry a `code` so they map to the new catalogue entries; older ones use `kind`.
 */
export function applicantKindOf(n: AppNotification): EventCode {
  if (n.code) return n.code;
  if (n.kind) return APPLICANT_KIND[n.kind];
  return n.icon === "sign" ? "document.requested" : "application.status_changed";
}

export const fromApplicant = (n: AppNotification): SharedNotification =>
  build(applicantKindOf(n), { id: n.id, title: n.title, body: n.detail, createdAt: n.createdAt, read: !n.unread, href: n.link?.href ?? null });

/* ------------------------------ Staff ------------------------------ */

export const STAFF_KIND: Record<NotificationEvent, EventCode> = {
  "shift-updated": "shift.updated",
  "sop-assigned": "sop.assigned",
  "training-assigned": "training.assigned",
  "leave-updated": "leave.updated",
  "document-requested": "document.requested",
  "assignment-changed": "assignment.changed",
  announcement: "announcement.published",
};

export const staffKindOf = (n: StaffNotification): EventCode => STAFF_KIND[n.event];

export const fromStaff = (n: StaffNotification): SharedNotification =>
  build(staffKindOf(n), { id: n.id, title: n.title, body: n.message, createdAt: n.createdAt, read: n.read, href: n.destination.href });

/* ------------------------------ Admin ------------------------------ */

/** Older Admin items have no kind; derive it from the link or the words, as AdminShell did for the ringtone. */
export function adminKindOf(n: AdminNotification): EventCode {
  if (n.kind) return n.kind;
  if (n.href.startsWith("/admin/clients/requests") || /client request/i.test(n.title)) return "client.request";
  if (n.href.includes("category=workforce")) return "client.request";
  if (n.href.includes("/documentation")) return "document.resubmitted";
  if (n.href.includes("/recruitment/applicants")) return "application.new";
  if (n.href.startsWith("/admin/inbox")) return "inbox.assigned";
  return "general.notice";
}

export const fromAdmin = (n: AdminNotification): SharedNotification =>
  build(adminKindOf(n), { id: n.id, title: n.title, body: n.message, createdAt: n.createdAt, read: n.read, href: n.href });

/* ------------------------------ Client ----------------------------- */

export function clientKindOf(n: ClientNotification): EventCode {
  if (n.kind) return n.kind;
  if (n.href.startsWith("/client/recruitment")) return "client.candidates_ready";
  if (n.href.startsWith("/client/requests")) return "client.request_updated";
  if (n.href.includes("compliance")) return "client.compliance_expiring";
  return "general.notice";
}

export const fromClient = (n: ClientNotification): SharedNotification =>
  build(clientKindOf(n), { id: n.id, title: n.title, body: n.message, createdAt: n.createdAt, read: n.read, href: n.href || null });
