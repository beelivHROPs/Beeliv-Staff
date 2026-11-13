/**
 * Inbox / Requests data shapes (Master Spec v1.5 sections 28.1, 31). These are
 * what a Supabase adapter must return, so screens never change when the mock
 * is replaced. Presentation-facing only; routing and permission rules are the
 * backend's - the flags below only decide what the UI shows.
 *
 * `reference` (BLV-ENQ / BLV-SUP / BLV-WFR, spec 31.1) is generated SERVER-SIDE:
 * screens display it, never compose or hardcode one, and key / link by `id`.
 * Messages, notes, attachments and activity rows use internal ids only.
 */

export type ISODateTime = string;

/**
 * The seven queues routed to HR (spec 31.2). Public Contact and Work With
 * Beeliv / consultation go to Operations / delegated triage, so they are NOT
 * in this union and never reach an HR user's inbox.
 */
export type InboxCaseCategory =
  | "training-enquiry"
  | "staff-support"
  | "client-support"
  | "workforce-request"
  | "candidate-feedback"
  | "applicant-documents"
  | "technical-account"
  /** A candidate said they cannot make an interview time (docs/contracts/interviews-and-application-journeys.md). Added 2026-10-19. */
  | "cant-attend";

/** Prototype roles. Which sub-levels see which queues beyond this needs Beeliv confirmation. */
export type InboxRole = "hrManager" | "hrOfficer";

/** Spec 28.1 requires "status" but lists no values: this set needs Beeliv confirmation. */
export type InboxStatus = "new" | "open" | "waiting-on-sender" | "escalated" | "resolved";

/** "public" = an external enquirer (e.g. a training enquiry from the website) with no account. */
export type SenderKind = "applicant" | "staff" | "client" | "public";

export interface InboxSender {
  name: string;
  kind: SenderKind;
  /** Client organisation, when the sender is a Client user. */
  organisation?: string;
  email?: string;
}

export interface InboxAssignee {
  id: string;
  name: string;
}

export interface InboxAttachment {
  id: string;
  name: string;
  sizeLabel: string;
}

export type RelatedKind = "applicant" | "staff" | "client" | "workforce-request" | "interview";

export interface RelatedRecord {
  kind: RelatedKind;
  /** Internal id of the record. */
  id: string;
  label: string;
  /** null when that record's page is not built yet. */
  href: string | null;
}

/**
 * Delivery of one outbound PUBLIC reply by email (docs/contracts/inbox-email.md).
 * "unknown" = we could not confirm the outcome; it is reconciled, never resent
 * blindly. "complained" = the recipient reported an earlier email as unwanted
 * (the address is then on the suppression list). Webhooks can arrive out of
 * order: a late "sent" must never overwrite "delivered" (server rule).
 */
export type EmailDeliveryState = "queued" | "sent" | "delivered" | "failed" | "bounced" | "complained" | "unknown";

export interface MessageDelivery {
  state: EmailDeliveryState;
  /** The address the email went to (the one on the case at send time). */
  to: string;
  updatedAt: ISODateTime;
  attempts: number;
  /** Decided by the server from state, attempts, suppression and rate limits. The UI never infers it. */
  canRetry: boolean;
  /** Only for "unknown" (and old "queued"): ask the server to reconcile. Never sends. */
  canCheckStatus: boolean;
  /** Safe support reference for an operator (never provider internals). */
  supportRef?: string;
}

export interface InboxMessage {
  id: string;
  direction: "inbound" | "outbound";
  authorName: string;
  body: string;
  createdAt: ISODateTime;
  attachments: InboxAttachment[];
  /** Outbound only. Absent = sent inside the app, no email involved (older replies, in-app-only cases). */
  delivery?: MessageDelivery;
  /** Inbound only: this message arrived as an email reply (after quoted text and signature were stripped). */
  viaEmail?: boolean;
}

/**
 * Where a public reply on this case would go. Decided by the server from the
 * email already on the case; the UI only shows it. "none" disables the reply
 * composer with an honest note (internal notes still work).
 */
export type ReplyRoute =
  | { mode: "email"; to: string }
  | { mode: "none"; reason: "no-email" | "in-app-only" | "suppressed" };

/** Visible to Beeliv staff only. Never delivered to the sender. */
export interface InboxNote {
  id: string;
  authorName: string;
  body: string;
  createdAt: ISODateTime;
}

export type ActivityKind = "created" | "assigned" | "status" | "reply" | "note" | "escalated";

export interface InboxActivity {
  id: string;
  kind: ActivityKind;
  text: string;
  actorName: string;
  createdAt: ISODateTime;
}

/** One row of the case list. */
export interface InboxCaseSummary {
  id: string;
  reference: string;
  subject: string;
  /** First line of the latest message. */
  preview: string;
  category: InboxCaseCategory;
  status: InboxStatus;
  sender: InboxSender;
  assignedTo: InboxAssignee | null;
  lastActivityAt: ISODateTime;
  attachmentCount: number;
  /** Unread inbound activity for this user. */
  unread: boolean;
  /** How many inbound messages are unread (0 when `unread` is false). */
  unreadCount: number;
  /** The latest message was sent by Beeliv (shows a "replied" tick in the list). */
  lastFromUs: boolean;
  /** Needs HR action now (unread reply / unassigned). The exact rule belongs to the backend. */
  needsAction: boolean;
}

/**
 * Present only on a "cant-attend" case. The interview time the candidate was given, their reason and
 * note, and where the request stands. The Reschedule action opens the existing reschedule dialog for `interviewId`.
 */
export interface InterviewRequestInfo {
  interviewId: string;
  /** "open" = HR has not changed the time yet. */
  status: "open" | "rescheduled" | "cancelled" | "withdrawn";
  reason: string;
  note: string;
  /** The time the candidate cannot make. */
  originalAt: ISODateTime;
  /** The interview as HR left it. */
  interviewLabel: string;
}

export interface InboxCaseDetail extends InboxCaseSummary {
  /** Only on "cant-attend" cases. */
  interviewRequest?: InterviewRequestInfo;
  createdAt: ISODateTime;
  related: RelatedRecord | null;
  messages: InboxMessage[];
  notes: InboxNote[];
  activity: InboxActivity[];
  replyRoute: ReplyRoute;
}

/** Permission-aware flags. UI convenience only: the backend / RLS decides. */
export interface InboxPermissions {
  canAssign: boolean;
  canReply: boolean;
  canAddNote: boolean;
  canChangeStatus: boolean;
  canEscalate: boolean;
}

export interface InboxList {
  role: InboxRole;
  /** The signed-in HR user, for the "Assigned to me" filter. */
  me: InboxAssignee;
  permissions: InboxPermissions;
  assignees: InboxAssignee[];
  cases: InboxCaseSummary[];
}

export interface InboxCaseResult {
  permissions: InboxPermissions;
  assignees: InboxAssignee[];
  detail: InboxCaseDetail;
}

/**
 * An inbound email that could not be matched to a case (no/unknown token, a
 * closed token, a sender that differs from the case). Visible only to
 * Operations or the delegated triage owner (needs Beeliv confirmation).
 * The snippet is plain text with quoted history and signature already stripped.
 */
export type NeedsHomeReason = "no-case-address" | "case-not-found" | "sender-differs";

export interface NeedsHomeItem {
  id: string;
  fromName: string | null;
  fromEmail: string;
  subject: string;
  /** First lines of the stripped body, plain text. */
  snippet: string;
  receivedAt: ISODateTime;
  reason: NeedsHomeReason;
  attachmentCount: number;
}

/** A case the triage owner can attach an unmatched email to. Names and references only. */
export interface CasePickerItem {
  id: string;
  reference: string;
  subject: string;
  senderName: string;
  senderEmail: string | null;
}
