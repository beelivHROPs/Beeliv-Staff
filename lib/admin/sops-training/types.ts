/**
 * SOPs, Training and Agreements (HR content publishing). These are the shapes a
 * Supabase adapter must return. Field names and status labels deliberately
 * match what the Staff app consumes (lib/staff/types.ts: SOP, SOPSection,
 * SOPAssignment, Training, TrainingAssignment, Agreement, AgreementAcceptance).
 * No business rule lives here: who must accept, how an audience is matched and
 * whether a new SOP version forces re-acknowledgement are backend decisions
 * that need Beeliv confirmation. All people are FICTIONAL in the mock.
 */

export type ContentKind = "sop" | "training" | "agreement";
export type ContentStatus = "draft" | "published" | "archived";
export type ContentAction = "publish" | "unpublish" | "archive" | "restore";
export type SaveIntent = "save" | "publish";

/** SOP / training: Staff labels are Assigned / In progress / Completed; Overdue is an Admin-side derived view. Agreements: Pending / Accepted / Needs re-acceptance. */
export type TrackStatus = "assigned" | "in-progress" | "completed" | "overdue" | "pending" | "accepted" | "reaccept";

export interface Audience {
  allStaff: boolean;
  clientIds: string[];
  outletIds: string[];
  roleIds: string[];
  departmentIds: string[];
}

export interface SectionInput {
  id: string;
  title: string;
  body: string;
}

/** A PDF is added as a link (project lead: SOPs are published with links, not uploads). `fileName` is just a label for the link. */
export interface PdfAttachment {
  fileName: string;
  sizeBytes: number;
  url?: string;
}

/** Optional video slot ("just in case they want videos"): an upload or a link. */
export type VideoSlot = { mode: "link"; url: string } | { mode: "upload"; fileName: string; sizeBytes: number };

export type TrainingType = "course" | "video" | "document" | "practical";

export interface Counts {
  assigned: number;
  /** Completed / acknowledged / accepted. */
  done: number;
  inProgress: number;
  overdue: number;
  /** Agreements only: accepted an earlier version, must accept the new one. */
  reaccept: number;
}

export interface ContentRow {
  id: string;
  kind: ContentKind;
  title: string;
  category: string;
  /** Version being edited or live, e.g. "v3". */
  version: string;
  /** The version staff currently see, when a newer draft version exists. */
  liveVersion: string | null;
  status: ContentStatus;
  audienceLabel: string;
  /** SOP: acknowledgement required. Training: required. Agreement: must accept. */
  required: boolean;
  effectiveDate: string;
  dueDate: string;
  counts: Counts;
  updatedAt: string;
  hasPdf: boolean;
  hasVideo: boolean;
}

export interface VersionEntry {
  version: string;
  state: "live" | "draft" | "superseded";
  at: string;
  by: string;
  note: string;
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

export interface Assignee {
  id: string;
  staffId: string;
  name: string;
  role: string;
  placement: string;
  status: TrackStatus;
  dueDate: string;
  doneAt: string | null;
  /** Version the person completed / accepted. */
  doneVersion: string | null;
}

export interface ContentDetail extends ContentRow {
  summary: string;
  departmentId: string;
  trainingType: TrainingType;
  durationMinutes: number | null;
  sections: SectionInput[];
  pdf: PdfAttachment | null;
  video: VideoSlot | null;
  audience: Audience;
  versions: VersionEntry[];
  activity: ActivityEntry[];
  assignees: Assignee[];
  allowedActions: ContentAction[];
  canEdit: boolean;
}

export interface ContentInput {
  kind: ContentKind;
  title: string;
  category: string;
  summary: string;
  departmentId: string;
  trainingType: TrainingType;
  durationMinutes: string;
  required: boolean;
  effectiveDate: string;
  dueDate: string;
  sections: SectionInput[];
  pdf: PdfAttachment | null;
  video: VideoSlot | null;
  audience: Audience;
}

export interface ActionInput {
  action: ContentAction;
}

export interface ContentQuery {
  kind: ContentKind;
  search: string;
  status: "" | ContentStatus;
  category: string;
  /** Show-more window. */
  limit: number;
}

export interface ContentPage {
  rows: ContentRow[];
  total: number;
  statusCounts: Record<"all" | ContentStatus, number>;
  kindCounts: Record<ContentKind, number>;
  facets: { categories: string[] };
  workspaceEmpty: boolean;
  canCreate: boolean;
}

export interface IdName {
  id: string;
  name: string;
}

export interface ContentConfig {
  categories: Record<ContentKind, string[]>;
  departments: IdName[];
  clients: { id: string; name: string; outlets: IdName[] }[];
  roles: IdName[];
  trainingTypes: { value: TrainingType; label: string }[];
  canCreate: boolean;
}

export type FieldErrors = Record<string, string>;

export class ContentValidationError extends Error {
  fields: FieldErrors;
  constructor(fields: FieldErrors) {
    super("Validation failed");
    this.name = "ContentValidationError";
    this.fields = fields;
  }
}
