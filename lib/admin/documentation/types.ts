/**
 * Documentation queue + document viewer data shapes (spec 30.1, 30.2, 30.3).
 * Presentation-facing only. Person status, application status, document status
 * and assignment status are SEPARATE concepts: this file models the DOCUMENT
 * status only. All people are FICTIONAL. Records are keyed by internal `id`;
 * `BLV-*` references come only from the adapter, never composed in the UI.
 * Sensitive values (NIN, bank, identity numbers) arrive ALREADY MASKED from the
 * adapter: the UI never holds or renders a full value.
 */
import type { ISODateTime } from "../types";

/**
 * Document status. The set is the spec 30.3 list (Needs Review, Missing,
 * Resubmitted / Resubmission Required, Verified / Completed). Whether
 * "rejected" is a separate outcome from "resubmission required" needs Beeliv
 * confirmation; this prototype has one action that asks for a resubmission.
 */
export type DocumentStatus = "needs-review" | "missing" | "resubmission-required" | "resubmitted" | "verified";

/** Queue tabs. `resubmission` groups "resubmission-required" and "resubmitted" (spec 30.3 names both). */
export type DocumentTab = "needs-review" | "missing" | "resubmission" | "verified";

/** Application vs pre-employment documents stay distinguishable (spec 30.1). */
export type DocumentStage = "application" | "pre-employment";

export type OwnerKind = "applicant" | "staff";

export interface DocumentOwner {
  /** Internal id of the Applicant or Staff record: the link target. */
  id: string;
  kind: OwnerKind;
  name: string;
  /** Server-generated person reference (BLV-APP-... / BLV-STF-...). */
  reference: string;
}

export interface DocumentRow {
  id: string;
  owner: DocumentOwner;
  /** Reference shown in the queue: the application reference for applicants, the staff reference for staff. */
  reference: string;
  docType: string;
  stage: DocumentStage;
  /** Vacancy (applicants) or assignment (staff) context. */
  context: string;
  /** Filter facet value for the context. */
  vacancy: string;
  uploadedAt: ISODateTime | null;
  status: DocumentStatus;
  reviewer: string | null;
  /** What the person / HR must do next. */
  requiredAction: string;
}

export interface DocumentQuery {
  search: string;
  tab: DocumentTab;
  docType: string;
  vacancy: string;
  /** "" = anyone, "__none" = unassigned, otherwise a reviewer name. */
  reviewer: string;
  /** Sort id, see DOCUMENT_SORTS. Compared on the full upload timestamp (missing uploads sort last). */
  sort: string;
  page: number;
  pageSize: number;
}

export const DOCUMENT_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "person", label: "Person A-Z" },
  { value: "type", label: "Document type" },
];

export interface DocumentCapabilities {
  /** HR can verify. HR Officer vs HR Manager difference: needs Beeliv confirmation. */
  canVerify: boolean;
  canRequestResubmission: boolean;
  canReplace: boolean;
  /** Secure open / download is a logged action not available in the demo. */
  canSecureOpen: boolean;
}

export interface DocumentQueuePage {
  rows: DocumentRow[];
  total: number;
  /** Counts for the current search / type / vacancy / reviewer filters (not the tab). */
  tabCounts: Record<DocumentTab, number>;
  facets: { docTypes: string[]; vacancies: string[]; reviewers: string[] };
  workspaceEmpty: boolean;
}

export interface DocumentVersion {
  version: number;
  filename: string;
  mime: string;
  sizeBytes: number;
  uploadedAt: ISODateTime;
  uploadedBy: string;
  current: boolean;
}

/** Every action appends one of these: who / when / action / previous -> new (spec 32.2). */
export interface DocumentHistoryEntry {
  id: string;
  at: ISODateTime;
  actor: string;
  action: string;
  previous: string | null;
  next: string | null;
  note?: string;
}

/** A sensitive value, masked by the adapter (last digits only). */
export interface MaskedField {
  label: string;
  /** e.g. "NIN ending 4821". Never a full value. */
  masked: string;
}

export interface DocumentRecord extends DocumentRow {
  filename: string | null;
  mime: string | null;
  sizeBytes: number | null;
  /** Who uploaded it and from where (applicant portal, HR on behalf, staff portal). */
  uploader: { name: string; source: string } | null;
  verifiedBy: string | null;
  verifiedAt: ISODateTime | null;
  /** Latest rejection / resubmission reason or reviewer note. */
  note: string | null;
  versions: DocumentVersion[];
  history: DocumentHistoryEntry[];
  /** Present only for identity / bank documents. */
  sensitive: MaskedField | null;
  capabilities: DocumentCapabilities;
}

export interface ResubmissionInput {
  /** Required. Written to the history and shown to the person. */
  reason: string;
}
