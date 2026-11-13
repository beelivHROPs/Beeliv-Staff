/**
 * Applicants slice (HR): data shapes a Supabase adapter must return.
 * Presentation contracts only. The spec (Master Spec v1.5 sections 14, 28.2,
 * 29.4, 30, 31.1) does not define stage-transition rules, tab-to-stage
 * mapping, SLA thresholds or recruiter scoping, so none live here: the backend
 * owns them. All people are FICTIONAL.
 *
 * References (`reference`, `applicationRef`) are generated SERVER-SIDE. Screens
 * show what the adapter returns; they never compose a reference, and records are
 * keyed and linked by internal `id`.
 */
import type { ISODateTime } from "../types";

/** Index into APPLICATION_STAGES (lib/applicant/types.ts). */
export type StageIndex = number;

/**
 * Rejected and Hold are separate retained statuses (Source of Truth s3), not
 * stages. `stage` keeps the stage the person was at when the status was set.
 */
export type ApplicantStatus = "active" | "hold" | "rejected" | "talent-pool";

/** List tabs. How a tab maps onto stages needs Beeliv confirmation (see applicants/filters.ts). */
export type StageTab = "all" | "new" | "shortlisted" | "interview" | "documentation" | "approval" | "talent-pool";

export interface PersonRef {
  id: string;
  name: string;
}

export interface ApplicantRow {
  /** Internal id of the application record (route key). */
  id: string;
  /** Server-generated Applicant reference (BLV-APP-...). Display / search only. */
  reference: string;
  /** Server-generated Application reference (BLV-APL-...). Display / search only. */
  applicationRef: string;
  name: string;
  vacancyId: string;
  vacancy: string;
  clientId: string;
  client: string;
  outlet: string;
  appliedAt: ISODateTime;
  /** Last change to the application (full timestamp). */
  updatedAt: ISODateTime;
  stage: StageIndex;
  status: ApplicantStatus;
  /** Meaningful at stage 1 (review / shortlisting). */
  shortlisted: boolean;
  recruiter: PersonRef | null;
  /** Profile completion, 0-100. */
  profilePercent: number;
  /** Document completion, 0-100. */
  documentsPercent: number;
  /** Short next-action label for the list; null when nothing is waiting. */
  nextAction: string | null;
  /** True when the next action needs HR now (red attention mark). */
  needsAttention: boolean;
  /** Already in the Talent Pool (so the row action is hidden). */
  inTalentPool: boolean;
}

export interface ApplicantsQuery {
  search: string;
  tab: StageTab;
  /** "" = any. Otherwise a stage index as a string, "hold", "rejected" or "placed". */
  stage: string;
  vacancyId: string;
  clientId: string;
  recruiterId: string;
  /** Sort id, see APPLICANT_SORTS. Compared on full ISO timestamps. */
  sort: string;
  /** Always 1: lists grow with Show more by raising pageSize. */
  page: number;
  pageSize: number;
}

export const APPLICANT_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Last updated" },
  { value: "name", label: "Name A-Z" },
];

export interface ApplicantFacets {
  vacancies: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  recruiters: PersonRef[];
}

export interface ApplicantsPage {
  rows: ApplicantRow[];
  /** Matches AFTER search and the dropdown filters, BEFORE the tab and pagination. */
  tabCounts: Record<StageTab, number>;
  /** Matches after every filter (what pagination walks). */
  total: number;
  /** True when the workspace has no applicants at all (distinct from "no matches"). */
  workspaceEmpty: boolean;
  facets: ApplicantFacets;
}

/* ---------- Applicant 360 ---------- */

/** What THIS user may do to THIS record. UI shows / hides; the backend re-checks. */
export interface ApplicantCapabilities {
  canShortlist: boolean;
  canHold: boolean;
  canReject: boolean;
  canRequestInfo: boolean;
  canSubmitForApproval: boolean;
  /** False for HR (final approval belongs to the Head of Operations, rbac.md). True only for the Operations identity when a selection decision is due (documents verified, or submitted). */
  canApproveSelection: boolean;
  canAddNote: boolean;
  /** Move a person who is not selected (not shortlisted or rejected / on hold) into the Talent Pool. False once they are already there. */
  canMoveToTalentPool: boolean;
}

export type RecruitmentAction = "shortlist" | "hold" | "reject" | "request-info" | "submit-for-approval" | "approve-selection" | "talent-pool";

/** Authorised-only fields: the adapter says whether this user may see the value. */
export type Authorized<T> = { allowed: true; value: T } | { allowed: false };

/** Masked sensitive identifier: only the last digits ever reach the browser (spec 29.4). */
export interface MaskedField {
  label: string;
  /** e.g. "******7421". Built by the server; never the full value. */
  masked: string;
  /** Whether a reveal is a permitted action for this user. Reveal is NOT implemented in the prototype. */
  revealPermitted: boolean;
}

export interface NextRequiredAction {
  title: string;
  detail: string;
  /** Who must act: shown so HR knows if it is waiting on someone else. "you" = the viewer (Operations) must decide now. */
  owner: "hr" | "applicant" | "operations" | "you" | "none";
}

export type DocState = "missing" | "uploaded" | "needs-review" | "resubmitted" | "verified" | "rejected";

export interface ApplicantDocument {
  id: string;
  type: string;
  state: DocState;
  uploadedAt: ISODateTime | null;
  reviewer: string | null;
  /** Spec 14 Documentation: checklist, verification, guarantor, references. */
  group: "cv" | "checklist" | "guarantor-reference";
}

export interface ScreeningAnswer {
  id: string;
  question: string;
  answer: string;
}

/**
 * The full submitted application, read-only, grouped like the Applicant app's
 * application steps (components/applicant/apply/*). Everything the applicant
 * answered is here so HR never has to guess. Field values for restricted
 * data are decided by the adapter: `restricted` = this user may not see it,
 * `masked` = only the last digits were returned.
 */
export interface SubmissionField {
  id: string;
  label: string;
  /** null = not answered. */
  value: string | null;
  /** Multi-value answers (skills, multi-select questions). */
  items?: string[];
  masked?: boolean;
  restricted?: boolean;
  /** Small helper line under the value (e.g. why something is empty). */
  note?: string;
  /** Declarations: the wording version the applicant accepted, and when. */
  acceptedVersion?: string;
  acceptedAt?: ISODateTime;
}

export type SubmissionSectionKind = "personal" | "experience" | "education" | "skills" | "availability" | "documents" | "screening" | "declarations";

export interface SubmissionSection {
  id: string;
  kind: SubmissionSectionKind;
  title: string;
  /** When the applicant last edited this section (full timestamp). */
  lastEditedAt: ISODateTime | null;
  fields: SubmissionField[];
}

export interface ApplicationSubmission {
  submittedAt: ISODateTime;
  sections: SubmissionSection[];
}

export interface InterviewRecord {
  id: string;
  kind: "interview" | "assessment";
  title: string;
  at: ISODateTime | null;
  interviewer: string | null;
  state: "scheduled" | "completed" | "cancelled" | "not-scheduled";
  /** Scores / interviewer notes are HR + Ops only (data-visibility-matrix). Null until recorded. */
  recommendation: string | null;
}

export interface InternalNote {
  id: string;
  author: string;
  at: ISODateTime;
  body: string;
}

export interface ActivityRecord {
  id: string;
  actor: string;
  at: ISODateTime;
  action: string;
  /** Previous and new state labels; null when the action did not change state. */
  from: string | null;
  to: string | null;
}

export interface ApplicantDetail extends ApplicantRow {
  email: string;
  phone: string;
  location: string;
  professionalSummary: string;
  experience: { role: string; employer: string; period: string }[];
  skills: string[];
  availability: string;
  preferredLocations: string[];
  /** "where authorized" (spec 28.2): the adapter decides. */
  expectedSalary: Authorized<string>;
  sensitive: MaskedField[];
  employmentType: string;
  interviewState: string;
  assessmentState: string;
  nextRequired: NextRequiredAction;
  capabilities: ApplicantCapabilities;
  documents: ApplicantDocument[];
  screening: ScreeningAnswer[];
  /** The complete submitted application, grouped by section. */
  submission: ApplicationSubmission;
  interviews: InterviewRecord[];
  notes: InternalNote[];
  activity: ActivityRecord[];
}

export interface ActionInput {
  action: RecruitmentAction;
  /** Required for hold / reject / request-info (enforced by the UI; the backend re-validates). */
  note?: string;
}
