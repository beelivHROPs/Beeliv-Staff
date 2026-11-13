/**
 * Workforce slice (HR): Attendance, Leave, Scheduling, Warnings. Data shapes a
 * Supabase adapter must return; presentation contracts only, no business rules.
 * This is the Admin half of what the Staff app (check-in, leave, schedule,
 * records) and the Client app (attendance, schedules) already show: statuses
 * and labels are kept identical where the other apps define them.
 *
 * NOT defined by the spec, so NOT decided here (needs Beeliv confirmation):
 * lateness / grace thresholds, what counts as absent, who may approve leave,
 * who may correct attendance, who may issue a warning, the warning ladder and
 * severity levels, whether overnight shifts exist, whether schedule conflicts
 * should block. The backend owns every one of these; the UI shows what it
 * returns. Lists (leave types, sections, roles, warning types, severities,
 * shift templates) are configurable adapter data, never hard-coded in screens.
 *
 * References (`reference`) are generated SERVER-SIDE and only displayed; records
 * are keyed and linked by internal `id`. All people are FICTIONAL.
 */
import type { ISODateTime } from "../types";

/** "YYYY-MM-DD". */
export type ISODate = string;
/** "HH:MM", 24 hour. */
export type ClockTime = string;

export interface PersonRef {
  id: string;
  name: string;
  photoUrl?: string | null;
}

/** HR is scoped to assigned clients and outlets (data-visibility-matrix). */
export interface ScopeFacets {
  clients: { id: string; name: string }[];
  outlets: { id: string; clientId: string; name: string }[];
}

/** One line of a record's activity history (every write creates one, spec 30 / 32.2). */
export interface HistoryEntry {
  id: string;
  action: string;
  actor: string;
  at: ISODateTime;
  previous: string | null;
  next: string | null;
  note: string | null;
}

/* ------------------------------------------------------------------ */
/* Attendance                                                          */
/* ------------------------------------------------------------------ */

/**
 * Same four recorded statuses as the Client app (present / late / absent /
 * on-leave) plus "not-yet", which only exists for today: scheduled, no check-in
 * recorded yet. The backend decides late / absent; no threshold lives here.
 */
export type AttendanceStatus = "present" | "late" | "absent" | "on-leave" | "not-yet";

export type AttendanceFlag = "correction-requested" | "corrected" | "no-check-out";

export interface AttendanceRow {
  id: string;
  date: ISODate;
  staff: PersonRef;
  clientId: string;
  client: string;
  outletId: string;
  outlet: string;
  role: string;
  shiftLabel: string;
  shiftStart: ClockTime;
  shiftEnd: ClockTime;
  checkIn: ISODateTime | null;
  checkOut: ISODateTime | null;
  status: AttendanceStatus;
  flags: AttendanceFlag[];
}

export type AttendanceTab = "all" | "present" | "late" | "absent" | "on-leave" | "corrections";

export interface AttendanceQuery {
  search: string;
  tab: AttendanceTab;
  from: ISODate;
  to: ISODate;
  /** "" = any */
  clientId: string;
  outletId: string;
  pageSize: number;
}

/** Today's board (counts staff scheduled today within the client / outlet filter). */
export interface TodayBoard {
  date: ISODate;
  scheduled: number;
  checkedIn: number;
  notYet: number;
  late: number;
  absent: number;
  onLeave: number;
}

export interface AttendancePage {
  rows: AttendanceRow[];
  total: number;
  tabCounts: Record<AttendanceTab, number>;
  today: TodayBoard;
  facets: ScopeFacets;
  /** True when HR has no attendance data in scope at all. */
  workspaceEmpty: boolean;
}

export interface CorrectionRequest {
  id: string;
  requestedBy: string;
  at: ISODateTime;
  reason: string;
  proposedCheckIn: ClockTime | null;
  proposedCheckOut: ClockTime | null;
}

export interface AttendanceDetail extends AttendanceRow {
  reference: string;
  note: string | null;
  pendingCorrection: CorrectionRequest | null;
  history: HistoryEntry[];
  /** Backend-authored: whether this user may ask for a correction (who may needs Beeliv confirmation). */
  canRequestCorrection: boolean;
}

export interface CorrectionInput {
  reason: string;
  proposedCheckIn: ClockTime;
  proposedCheckOut: ClockTime;
}

/* ------------------------------------------------------------------ */
/* Leave                                                               */
/* ------------------------------------------------------------------ */

/** Staff app calls "declined" -> "Rejected". The brief for this screen asks for "Declined"; flagged for the project lead. */
export type LeaveStatus = "pending" | "approved" | "declined" | "cancelled";

export interface LeaveRow {
  id: string;
  staff: PersonRef;
  clientId: string;
  client: string;
  outletId: string;
  outlet: string;
  /** Label from backend configuration. */
  type: string;
  startDate: ISODate;
  endDate: ISODate;
  /** Backend-computed; the UI never counts days. */
  days: number;
  /** Only when the backend supplies it (same shape the Staff app shows); the UI never computes entitlement. */
  balance: { remaining: number; used: number; unit: string } | null;
  status: LeaveStatus;
  submittedAt: ISODateTime;
  /** Who decided it (approved / declined / cancelled), if anyone. */
  decidedBy: string | null;
  decidedAt: ISODateTime | null;
  reason: string | null;
  decisionNote: string | null;
  attachmentName: string | null;
  history: HistoryEntry[];
}

export type LeaveTab = LeaveStatus;

export interface LeaveQuery {
  search: string;
  tab: LeaveTab;
  clientId: string;
  outletId: string;
  /** "" = any type */
  type: string;
  pageSize: number;
}

export interface OffDay {
  date: ISODate;
  people: PersonRef[];
}

export interface LeavePage {
  rows: LeaveRow[];
  total: number;
  tabCounts: Record<LeaveTab, number>;
  /** Approved leave over the next seven days ("who is off"). */
  whoIsOff: OffDay[];
  facets: ScopeFacets & { types: string[] };
  /** Backend-authored. Who may approve or decline leave needs Beeliv confirmation. */
  canApprove: boolean;
  workspaceEmpty: boolean;
}

/** "Who's off" over any range (past, present or future). Approved leave only. */
export interface TimeOffQuery {
  from: ISODate;
  to: ISODate;
  /** "" = everyone; otherwise a person's name. */
  search: string;
}

export interface TimeOffEntry {
  /** The leave request id. */
  id: string;
  staff: PersonRef;
  type: string;
  /** The whole request, which may start before or end after the range. */
  startDate: ISODate;
  endDate: ISODate;
  /** Backend-computed total days of the request. */
  days: number;
  outlet: string;
  client: string;
  /** Who approved it and when. The reason text is deliberately NOT included (may be medical). */
  decidedBy: string | null;
  decidedAt: ISODateTime | null;
}

export interface TimeOffResult {
  /** One entry per day of the range, whether or not anyone is off. */
  days: { date: ISODate; people: (PersonRef & { type: string; requestId: string })[] }[];
  /** Approved requests that overlap the range (used by the person search). */
  entries: TimeOffEntry[];
  workspaceEmpty: boolean;
}

/** One person's leave record for the Staff profile. */
export interface StaffLeaveHistory {
  /** Approved days taken so far this calendar year (backend-computed). */
  takenThisYear: number;
  /** Only when the backend supplies it; never computed in the UI. */
  balance: { remaining: number; unit: string } | null;
  requests: { id: string; type: string; startDate: ISODate; endDate: ISODate; days: number; status: LeaveStatus }[];
}

/* ------------------------------------------------------------------ */
/* Scheduling                                                          */
/* ------------------------------------------------------------------ */

/**
 * draft = new, not published; changed = published shift edited since;
 * removing = published shift deleted, goes away when the week is published.
 * Staff see only "published" (and the published version of "changed").
 */
export type ShiftState = "published" | "draft" | "changed" | "removing";

export type ConflictKind = "double-booking" | "leave";

export interface ShiftConflict {
  id: string;
  kind: ConflictKind;
  label: string;
}

export interface ShiftRow {
  id: string;
  date: ISODate;
  staff: PersonRef;
  role: string;
  section: string;
  start: ClockTime;
  end: ClockTime;
  breakMins: number;
  state: ShiftState;
  createdBy: string;
  lastEditedBy: string;
  lastEditedAt: ISODateTime;
  /** Advisory only: whether conflicts should block needs Beeliv confirmation. Rest-time between shifts is NOT checked (rule unknown). */
  conflicts: ShiftConflict[];
}

export interface RosterStaff extends PersonRef {
  role: string;
  section: string;
}

export interface WeekRoster {
  weekStart: ISODate;
  outletId: string;
  outlet: string;
  client: string;
  shifts: ShiftRow[];
  /** Count of shifts not yet visible to staff (draft + changed + removing). */
  unpublishedCount: number;
  lastPublishedAt: ISODateTime | null;
  lastPublishedBy: string | null;
  /** Staff assigned to this outlet, for the shift sheet. */
  staff: RosterStaff[];
  history: HistoryEntry[];
  /** Configurable lists. */
  sections: string[];
  roles: string[];
  /** Whether last week has shifts that could be copied. */
  canCopyLastWeek: boolean;
  /** True while staff can see this week (published and not withdrawn). */
  published: boolean;
  createdBy: string;
  createdAt: ISODateTime;
  lastEditedBy: string;
  lastEditedAt: ISODateTime;
  /** Backend-authored. Who may create and publish schedules needs Beeliv confirmation (spec 24.6 only has the Client viewing). */
  canCreateSchedule: boolean;
  canPublishSchedule: boolean;
}

export interface ScheduleQuery {
  outletId: string;
  weekStart: ISODate;
}

export interface SchedulePage {
  facets: ScopeFacets;
  /** Null when the user has no outlet in scope. */
  roster: WeekRoster | null;
  workspaceEmpty: boolean;
}

export interface ShiftInput {
  staffId: string;
  date: ISODate;
  role: string;
  section: string;
  start: ClockTime;
  end: ClockTime;
  breakMins: number;
}

/* ------------------------------------------------------------------ */
/* Warnings and records                                                */
/* ------------------------------------------------------------------ */

/** Staff app maps issued -> "open", withdrawn -> "closed". "Disputed" has no Staff-app action yet (needs Beeliv confirmation). */
export type WarningStatus = "issued" | "acknowledged" | "disputed" | "withdrawn";

export type AckState = "not-required" | "awaiting" | "acknowledged";

export interface WarningRow {
  id: string;
  reference: string;
  staff: PersonRef;
  clientId: string;
  client: string;
  outletId: string;
  outlet: string;
  /** Label from configuration (no ladder is defined). */
  type: string;
  severity: string;
  issuedBy: string;
  effectiveDate: ISODate;
  status: WarningStatus;
  ack: AckState;
  acknowledgedAt: ISODateTime | null;
}

export type WarningTab = "all" | WarningStatus;

export interface WarningsQuery {
  search: string;
  tab: WarningTab;
  clientId: string;
  outletId: string;
  type: string;
  pageSize: number;
}

export interface WarningOptions {
  types: string[];
  severities: string[];
  /** Staff HR may issue to (in scope). */
  staff: (PersonRef & { client: string; outlet: string })[];
}

export interface WarningsPage {
  rows: WarningRow[];
  total: number;
  tabCounts: Record<WarningTab, number>;
  facets: ScopeFacets & { types: string[] };
  options: WarningOptions;
  /** Backend-authored. Who may issue needs Beeliv confirmation. */
  canIssue: boolean;
  workspaceEmpty: boolean;
}

export interface WarningDetail extends WarningRow {
  /** Written text shown to the staff member. */
  details: string;
  issuedAt: ISODateTime;
  requiresAcknowledgement: boolean;
  withdrawnReason: string | null;
  disputeNote: string | null;
  history: HistoryEntry[];
  canWithdraw: boolean;
}

export interface WarningInput {
  staffId: string;
  type: string;
  severity: string;
  details: string;
  effectiveDate: ISODate;
  requiresAcknowledgement: boolean;
}
