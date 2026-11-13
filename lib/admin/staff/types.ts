/**
 * Staff slice (HR): data shapes a Supabase adapter must return. Presentation
 * contracts only. Master Spec v1.5 sections 9.1, 28.1, 28.3, 29.2, 29.4, 31.1.
 * The spec does NOT define: staff status values, attendance late/absent rules,
 * leave approval rules, who may issue a warning, or reassignment mechanics
 * after resignation. Those are "needs Beeliv confirmation" and live in the
 * backend, not here. All people are FICTIONAL.
 *
 * References (`reference`) are generated SERVER-SIDE (BLV-STF-...). Screens show
 * what the adapter returns; they never compose one. Records are keyed and linked
 * by internal `id`. Applicant -> Staff is ONE continuous person.
 *
 * Sensitive values (NIN, bank, next of kin, home address, medical) never appear
 * in any list or search result and never in full in a detail payload: only a
 * server-built mask (spec 29.4).
 */
import type { ISODateTime } from "../types";

/** PROVISIONAL (the spec gives no staff status list): needs Beeliv confirmation. */
export type StaffStatus = "active" | "on-leave" | "suspended";

export interface PersonRef {
  id: string;
  name: string;
}

/** Spec 9.1: a primary HR is shown; other authorised HR users inherit access through the outlet/client assignment. NEVER a single hr_id on the staff record. */
export interface AssignedHr {
  primary: PersonRef | null;
  additional: number;
}

export interface StaffRow {
  id: string;
  reference: string;
  name: string;
  role: string;
  department: string;
  clientId: string;
  client: string;
  outletId: string;
  outlet: string;
  /** Start date of the CURRENT StaffAssignment. */
  assignmentStart: ISODateTime;
  status: StaffStatus;
  assignedHr: AssignedHr;
}

export interface StaffQuery {
  search: string;
  /** "" = any */
  clientId: string;
  outletId: string;
  department: string;
  role: string;
  status: "" | StaffStatus;
  /** Sort id, see STAFF_SORTS. Started sorts compare the full assignment-start timestamp. */
  sort: string;
  page: number;
  pageSize: number;
}

export const STAFF_SORTS = [
  { value: "name", label: "Name A-Z" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

export interface StaffFacets {
  clients: { id: string; name: string }[];
  outlets: { id: string; name: string; clientId: string }[];
  departments: string[];
  roles: string[];
}

export interface StaffPage {
  rows: StaffRow[];
  /** Counts after search + dropdown filters, before the status tab. */
  statusCounts: Record<"all" | StaffStatus, number>;
  total: number;
  /** No staff in this user's scope at all (distinct from "no matches"). */
  workspaceEmpty: boolean;
  facets: StaffFacets;
}

/* ---------- Staff 360 ---------- */

export interface MaskedSlot {
  label: string;
  /** Server-built mask, e.g. "*******7421". Never the full value. */
  masked: string;
}

export interface AssignmentRecord {
  id: string;
  clientId: string;
  client: string;
  outletId: string;
  outlet: string;
  role: string;
  department: string;
  start: ISODateTime;
  end: ISODateTime | null;
  status: "current" | "ended";
  /** Reason for ending / reassignment (spec section 7). Null for the current record. */
  reason: string | null;
}

export type DocState = "missing" | "uploaded" | "needs-review" | "resubmitted" | "verified" | "rejected";

export interface StaffDocument {
  id: string;
  type: string;
  state: DocState;
  updatedAt: ISODateTime | null;
  reviewer: string | null;
}

export interface AttendanceSample {
  id: string;
  date: ISODateTime;
  shift: string;
  checkIn: string | null;
  checkOut: string | null;
  state: "Present" | "Late" | "Absent" | "On leave";
}
export interface ScheduleSample {
  id: string;
  date: ISODateTime;
  shift: string;
  outlet: string;
}
export interface LeaveSample {
  id: string;
  type: string;
  from: ISODateTime;
  to: ISODateTime;
  state: "Approved" | "Pending" | "Declined";
}
export interface TrainingRecord {
  id: string;
  title: string;
  kind: "SOP" | "Training";
  state: "Acknowledged" | "Pending" | "Completed";
  at: ISODateTime | null;
}
export interface WarningRecord {
  id: string;
  title: string;
  issuedAt: ISODateTime;
  issuedBy: string;
  summary: string;
}
export interface AgreementRecord {
  id: string;
  name: string;
  version: string;
  state: "Accepted" | "Pending";
  at: ISODateTime | null;
}
export interface ActivityRecord {
  id: string;
  actor: string;
  at: ISODateTime;
  action: string;
  from: string | null;
  to: string | null;
}

/** Null for existing staff onboarded by invitation: nothing is fabricated (spec 28.3). */
export interface RecruitmentHistory {
  /** Internal applicant record id: the link target. Same person as the staff record. */
  applicantId: string;
  applicantReference: string;
  vacancy: string;
  appliedAt: ISODateTime;
  milestones: { id: string; label: string; at: ISODateTime }[];
}

export interface StaffDetail extends StaffRow {
  email: string;
  phone: string;
  employmentState: string;
  /** Restricted sub-sections: masked placeholders only (spec 29.4). */
  restricted: MaskedSlot[];
  assignments: AssignmentRecord[];
  documents: StaffDocument[];
  attendance: AttendanceSample[];
  schedule: ScheduleSample[];
  leave: LeaveSample[];
  training: TrainingRecord[];
  warnings: WarningRecord[];
  agreements: AgreementRecord[];
  recruitment: RecruitmentHistory | null;
  activity: ActivityRecord[];
}

/* ---------- Assignments ---------- */

export interface AssignmentRow {
  staffId: string;
  reference: string;
  name: string;
  /** Current StaffAssignment; null = approved, awaiting assignment. */
  current: AssignmentRecord | null;
  history: AssignmentRecord[];
}

export interface AssignmentsQuery {
  search: string;
  clientId: string;
}

export interface AssignmentsPage {
  rows: AssignmentRow[];
  facets: StaffFacets;
  workspaceEmpty: boolean;
}

export interface AssignInput {
  staffId: string;
  clientId: string;
  outletId: string;
  role: string;
  department: string;
  /** ISO date (yyyy-mm-dd). */
  start: string;
  /** Required: reason for the assignment / reassignment. */
  reason: string;
}

/* ---------- Staff documents ---------- */

export interface StaffDocRow extends StaffDocument {
  staffId: string;
  staffName: string;
  staffReference: string;
  client: string;
  outlet: string;
}
export interface StaffDocsQuery {
  search: string;
  state: "" | DocState;
  /** Sort id, see STAFF_DOC_SORTS. Compared on the full updated timestamp (never-updated sorts last). */
  sort: string;
  /** How many rows to return (Show more grows this). */
  limit: number;
}

export const STAFF_DOC_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Staff name A-Z" },
];
export interface StaffDocsPage {
  rows: StaffDocRow[];
  /** Matches after search and status, before the limit. */
  total: number;
  workspaceEmpty: boolean;
}
