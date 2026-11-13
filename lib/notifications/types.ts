/**
 * ONE SHARED NOTIFICATION SHAPE for all four apps (Applicant, Staff, Client,
 * Admin). FRONTEND TYPE ONLY: it is the proposed DTO for the future
 * `notifications` table (one row per person per event). Nothing here is stored
 * on a server; the per-app mock services map their older shapes onto it
 * through the small adapters in ./adapters.ts, so screens do not change.
 *
 * Related: ./catalog.ts is the event catalogue (what each `kind` means, who
 * receives it, required or optional, default channels, which sound it uses).
 * Rule of thumb for the future table: `kind` + an entity reference decide the
 * text; `title` and `body` here are the already-rendered copy for the bell.
 */
import type { EventCode } from "./catalog";

/** An event code from the catalogue, for example "interview.changed". */
export type NotificationKind = EventCode;

/**
 * How loudly the item should read. Only a view hint:
 *   info       ordinary news
 *   success    something went well (verified, approved, placed)
 *   attention  the person has something to do (upload, accept, respond)
 *   urgent     time or access is at risk (interview changed or cancelled, security)
 */
export type NotificationSeverity = "info" | "success" | "attention" | "urgent";

/**
 * Where the message is meant to appear. A VIEW HINT for the UI, not a delivery
 * record: whether an email actually went out is a mail-outbox fact (delivery
 * state), never inferred from this flag.
 */
export interface NotificationChannels {
  inApp: boolean;
  email: boolean;
}

export interface SharedNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** ISO date-time. */
  createdAt: string;
  /** ISO date-time the person read it; null = unread. The mocks only know read or unread, so they use createdAt as the read time. */
  readAt: string | null;
  /** In-app destination, or null when there is nothing to open. */
  href: string | null;
  /** Copied from the catalogue: a required message cannot be switched off by the person. */
  required: boolean;
  channels: NotificationChannels;
  severity: NotificationSeverity;
}
