/**
 * Client Review data shapes (spec 6.5 / 14 "Client Review: submit candidate,
 * client feedback, client approval/review where required"; spec 16 audit).
 * This is the Admin half of what the Client app shows at /client/recruitment:
 * the Client sees only candidates Beeliv HR deliberately SUBMITS, and answers
 * with Interested / Interview requested / Not suitable plus comments. That
 * feedback INFORMS Beeliv and never approves or hires: final approval belongs
 * to Operations (REC-001). HR never approves selection here.
 *
 * Open items (need Beeliv confirmation, never decided in a component):
 * - the overdue threshold for "days waiting" (the adapter returns `overdue`);
 * - how "Not suitable" maps onto the spec's "Client Rejected" applicant state;
 * - whether a client contact must be chosen, and which contacts exist.
 * References come from the adapter only. Records are keyed by internal `id`.
 * All people in the mock are FICTIONAL.
 */
import type { ISODateTime } from "../types";

/** Exactly the Client app's feedback values (lib/client/types.ts CandidateFeedback), plus "awaiting". */
export type ClientDecision = "awaiting" | "interested" | "interview-requested" | "not-suitable";

/**
 * ready = shortlisted and not yet sent to the client; submitted = with the
 * client; withdrawn = HR took it back; returned = sent back to the shortlist.
 */
export type SubmissionStatus = "ready" | "submitted" | "withdrawn" | "returned";

export type ReviewTab = "ready" | "awaiting" | "feedback" | "closed";

export interface ClientReviewRow {
  /** Internal submission id (route key). */
  id: string;
  /** Internal application id: link target to the applicant record. */
  applicantId: string;
  candidateName: string;
  /** Viewable photo URL when the backend supplies one (permission-gated). */
  photoUrl: string | null;
  vacancyId: string;
  vacancy: string;
  clientId: string;
  client: string;
  outlet: string | null;
  status: SubmissionStatus;
  decision: ClientDecision;
  /** True when HR recorded the client's answer on their behalf. */
  recordedByHr: boolean;
  submittedAt: ISODateTime | null;
  /** Whole days since submission while still awaiting the client. Null otherwise. */
  daysWaiting: number | null;
  /** Backend-decided (threshold needs Beeliv confirmation). */
  overdue: boolean;
  nextAction: string | null;
  needsAttention: boolean;
}

export interface ReviewHistoryEntry {
  id: string;
  actor: string;
  at: ISODateTime;
  action: string;
  from: string | null;
  to: string | null;
  note: string | null;
}

export interface ClientContact {
  id: string;
  name: string;
  role: string;
}

/** What the Client sees: only Beeliv-authorised fields (matches CandidateDetail in lib/client/types.ts). No NIN, banking, contacts or private HR notes. */
export interface ProfilePack {
  profileSummary: string;
  experienceSummary: string;
  skills: string[];
  interviewSummary: string;
  /** Names of documents approved for sharing with the client. Names only. */
  documents: string[];
}

export interface ClientComment {
  id: string;
  text: string;
  at: ISODateTime;
  source: "client-app" | "recorded-by-hr";
  by: string;
}

export interface ReviewCapabilities {
  canSubmit: boolean;
  canWithdraw: boolean;
  canRecordFeedback: boolean;
  canReturnToShortlist: boolean;
}

export interface ClientReviewDetail extends ClientReviewRow {
  applicantReference: string;
  /** Masked identity line, e.g. "NIN on file, hidden". Never a real number. */
  identityMasked: string;
  experienceYears: number | null;
  submittedTo: ClientContact | null;
  submissionNote: string | null;
  contacts: ClientContact[];
  pack: ProfilePack;
  comments: ClientComment[];
  history: ReviewHistoryEntry[];
  capabilities: ReviewCapabilities;
}

export interface ClientReviewQuery {
  search: string;
  tab: ReviewTab;
  clientId: string;
  vacancyId: string;
  /** Rows to return (Show more grows this). */
  limit: number;
}

export interface ClientReviewPage {
  rows: ClientReviewRow[];
  total: number;
  /** After search and dropdown filters, before the tab. */
  tabCounts: Record<ReviewTab, number>;
  facets: { clients: { id: string; name: string }[]; vacancies: { id: string; name: string }[] };
  /** True when there are no submissions at all (distinct from "no matches"). */
  workspaceEmpty: boolean;
}

export interface SubmitToClientInput {
  contactId: string;
  note: string;
}
export interface WithdrawInput {
  reason: string;
}
export interface ReturnToShortlistInput {
  reason: string;
}
/** Feedback the client gave outside the app (phone, WhatsApp, in person). */
export interface RecordFeedbackInput {
  decision: Exclude<ClientDecision, "awaiting">;
  reason: string;
  comment: string;
}

/** Labels match components/client/recruitment/meta.tsx so both apps say the same thing. */
export const DECISION_LABEL: Record<ClientDecision, string> = {
  awaiting: "Awaiting client",
  interested: "Interested",
  "interview-requested": "Interview requested",
  "not-suitable": "Not suitable",
};

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  ready: "Ready to submit",
  submitted: "With client",
  withdrawn: "Withdrawn",
  returned: "Returned to shortlist",
};

export const TAB_LABEL: Record<ReviewTab, string> = { ready: "Ready to submit", awaiting: "Awaiting client", feedback: "Feedback received", closed: "Closed" };
export const TAB_ORDER: ReviewTab[] = ["ready", "awaiting", "feedback", "closed"];
