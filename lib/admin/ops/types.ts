/**
 * Operations approvals data shapes (docs/contracts/ops-approvals.md, DRAFT).
 * Presentation-facing only: the backend owns every rule and status transition.
 * HR submits; ONLY Operations decides (rbac.md section 5; HR never approves).
 * All people are FICTIONAL. Records are keyed by internal `id`; `BLV-*`
 * references come only from the adapter. Sensitive fields (NIN, banking) are
 * never part of these shapes: only a document status is.
 */
import type { ISODateTime } from "../types";

/** What is being approved. A selection is the "select this applicant" decision; an offer is the offer terms. */
export type ApprovalKind = "selection" | "offer";

/** `rejected` is listed under the "Sent back" tab for now (needs Beeliv confirmation). */
export type ApprovalStatus = "waiting" | "approved" | "sent-back" | "rejected";

export type ApprovalTab = "waiting" | "approved" | "sent-back";

export type ApprovalDecision = "approve" | "send-back" | "reject";

export interface ApprovalPerson {
  id: string;
  name: string;
  photoUrl?: string | null;
}

export interface ApprovalRow {
  id: string;
  /** Server-generated (BLV-APR-...). Display only. */
  reference: string;
  kind: ApprovalKind;
  applicant: ApprovalPerson;
  vacancy: string;
  role: string;
  clientId: string;
  client: string;
  outlet: string;
  status: ApprovalStatus;
  /** When HR submitted it (age of the wait). */
  submittedAt: ISODateTime;
  submittedBy: string;
  /** When Operations decided, if it has. */
  decidedAt: ISODateTime | null;
}

export interface ApprovalFact {
  label: string;
  value: string;
}

export interface HrRecommendation {
  by: string;
  at: ISODateTime;
  /** Display text, e.g. "Recommended". */
  verdict: string;
  note: string;
}

/** Scores arrive as display text: scales and pass marks are not confirmed by Beeliv. */
export interface ScoreLine {
  id: string;
  label: string;
  /** e.g. "78%" or "4 of 5". */
  score: string;
  detail: string;
}

export type DocumentState = "verified" | "pending" | "requested-again" | "missing";

export interface DocumentStatusLine {
  id: string;
  label: string;
  state: DocumentState;
  /** Always masked: the adapter never sends a real NIN or bank value, only that one is on file. */
  sensitive: boolean;
  reviewedBy: string | null;
}

export interface ApprovalPayLine {
  key: string;
  label: string;
  value: string;
  visibility: "public" | "internal";
}

export interface ApprovalHistoryEntry {
  id: string;
  at: ISODateTime;
  actor: string;
  action: string;
  reason?: string;
}

export interface DecisionRecord {
  decision: ApprovalDecision;
  by: string;
  at: ISODateTime;
  /** Required for send back and reject; optional for approve. */
  note: string | null;
}

export interface ApprovalDetail extends ApprovalRow {
  /** Bumps on every change. Sent with a decision so a stale screen is refused (conflict). */
  revision: number;
  applicantFacts: ApprovalFact[];
  recommendation: HrRecommendation;
  tests: ScoreLine[];
  interviews: ScoreLine[];
  documents: DocumentStatusLine[];
  /** Only for offers: the terms Operations is approving. */
  offerTerms: ApprovalFact[] | null;
  offerPay: ApprovalPayLine[] | null;
  /** Internal offer id for the "View full offer" link (offers only). */
  offerId: string | null;
  decision: DecisionRecord | null;
  allowedDecisions: ApprovalDecision[];
  history: ApprovalHistoryEntry[];
}

export interface ApprovalQuery {
  search: string;
  tab: ApprovalTab;
  /** "" = both. */
  kind: ApprovalKind | "";
  clientId: string;
}

export interface ApprovalsPage {
  rows: ApprovalRow[];
  total: number;
  tabCounts: Record<ApprovalTab, number>;
  facets: { clients: { id: string; name: string }[] };
  /** True when there are no approvals at all (not merely none matching). */
  workspaceEmpty: boolean;
}

export interface DecisionInput {
  decision: ApprovalDecision;
  note: string;
  expectedRevision: number;
}

/** Counts for Operations Home. Each links to a filtered list. */
export interface OpsSummary {
  waitingSelections: number;
  waitingOffers: number;
  sentBack: number;
  approved: number;
  /** Oldest waiting request, for a gentle "waiting the longest" line. */
  oldestWaitingAt: ISODateTime | null;
}
