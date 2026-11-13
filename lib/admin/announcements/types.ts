/**
 * Announcements (HR content publishing). Shapes a Supabase adapter must return.
 * The Staff app consumes `Announcement { id, title, body, source, publishedAt,
 * imageUrl }` (lib/staff/types.ts); pinning, expiry, scheduling, audience and
 * read receipts are Admin-side fields the backend adds. Email delivery is NOT
 * built: it needs Beeliv confirmation. All people are FICTIONAL in the mock.
 */

export type AnnouncementStatus = "draft" | "scheduled" | "published" | "expired";
export type AnnouncementAction = "publish" | "unpublish" | "end";
export type SaveIntent = "save" | "publish";
export type PublishMode = "now" | "schedule";
export type ReceiptStatus = "acknowledged" | "read" | "unread";

export interface Audience {
  allStaff: boolean;
  clientIds: string[];
  outletIds: string[];
  roleIds: string[];
}

export interface IdName {
  id: string;
  name: string;
}

export interface AnnouncementCounts {
  recipients: number;
  read: number;
  acknowledged: number;
}

export interface AnnouncementRow {
  id: string;
  title: string;
  excerpt: string;
  status: AnnouncementStatus;
  audienceLabel: string;
  includeApplicants: boolean;
  pinned: boolean;
  requiresAcknowledgement: boolean;
  /** ISO date-time it goes (or went) live; null for a draft with no date. */
  publishAt: string | null;
  /** YYYY-MM-DD or "". */
  expiresOn: string;
  counts: AnnouncementCounts;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  staffId: string;
  name: string;
  role: string;
  placement: string;
  status: ReceiptStatus;
  readAt: string | null;
  acknowledgedAt: string | null;
}

export interface ActivityEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  from: string | null;
  to: string | null;
  note?: string;
}

export interface AnnouncementDetail extends AnnouncementRow {
  body: string;
  audience: Audience;
  publishMode: PublishMode;
  /** YYYY-MM-DD, for scheduled announcements. */
  scheduledDate: string;
  /** HH:MM (24h), for scheduled announcements. */
  scheduledTime: string;
  receipts: Receipt[];
  activity: ActivityEntry[];
  allowedActions: AnnouncementAction[];
  canEdit: boolean;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  audience: Audience;
  includeApplicants: boolean;
  requiresAcknowledgement: boolean;
  pinned: boolean;
  publishMode: PublishMode;
  scheduledDate: string;
  scheduledTime: string;
  expiresOn: string;
}

export interface AnnouncementQuery {
  search: string;
  status: "" | AnnouncementStatus;
  limit: number;
}

export interface AnnouncementPage {
  rows: AnnouncementRow[];
  total: number;
  statusCounts: Record<"all" | AnnouncementStatus, number>;
  workspaceEmpty: boolean;
  canCreate: boolean;
}

export interface AnnouncementConfig {
  clients: { id: string; name: string; outlets: IdName[] }[];
  roles: IdName[];
  canCreate: boolean;
}

export type FieldErrors = Record<string, string>;

export class AnnouncementValidationError extends Error {
  fields: FieldErrors;
  constructor(fields: FieldErrors) {
    super("Validation failed");
    this.name = "AnnouncementValidationError";
    this.fields = fields;
  }
}
