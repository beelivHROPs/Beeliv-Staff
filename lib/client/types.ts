/**
 * Client app domain types (brief sections 26-28). These describe the CONTRACT
 * the UI consumes; the eventual Supabase adapter must return these shapes.
 * Nothing here encodes an operational rule (lateness, coverage thresholds,
 * compliance limits, salary visibility...): statuses and counts arrive from the
 * backend, the UI only displays them.
 *
 * One operational record, many permission-aware views: an AttendanceRecord is
 * the SAME record Staff, HR and Ops see - Client only receives the rows its
 * outlet scope authorises. There are no Client-only operational tables.
 *
 * Nothing sensitive lives here on purpose: no NIN, banking, identity
 * documents or private HR notes exist in these types, so they can never be
 * rendered by accident. (Real protection is RLS on the backend.)
 */

/** ISO calendar date, "YYYY-MM-DD" (no timezone). */
export type ISODate = string;
/** 24h clock time, "HH:mm". */
export type ClockTime = string;
/** ISO 8601 date-time. */
export type ISODateTime = string;

export type LoadStatus = "loading" | "ready" | "empty" | "error" | "restricted";

export interface Loadable<T> {
  data: T | null;
  status: LoadStatus;
  retry: () => void;
}

/* ------------------------------------------------------------------ */
/* Session, access and outlet scope                                    */
/* ------------------------------------------------------------------ */

export type ClientAccountState =
  | "active"
  | "invitation-required"
  | "invitation-expired"
  | "invitation-invalid"
  | "invitation-used"
  | "suspended"
  | "no-client-access"
  | "wrong-portal"
  | "no-outlets";

export interface Outlet {
  id: string;
  name: string;
  /** Display location, e.g. "Abuja, FCT". */
  location: string;
  /** Cover photo from the backend; null = approved Beeliv placeholder (lib/client/assets.ts). */
  imageUrl: string | null;
}

/**
 * The selected scope: every outlet the user may see ("all") or one outlet id.
 * The UI only ever offers scopes returned by the backend in ClientSession.
 */
export type OutletScope = "all" | string;

export interface BeelivTeam {
  name: string;
  role: string;
  /** Approved contact channels - null until Beeliv confirms them (TBD). */
  phone: string | null;
  email: string | null;
}

export interface ClientSession {
  accountState: ClientAccountState;
  user: { id: string; firstName: string; lastName: string; salutation: string | null; avatarUrl: string | null; /** Sign-in email (read-only in Settings). */ email?: string | null };
  /** Read-only account facts shown in Settings ("Managed by Beeliv"). DEV FIXTURE until the backend supplies them. */
  clientId?: string;
  accessLevel?: string;
  primaryOutletId?: string;
  clientName: string;
  /** Only outlets this user is authorised for. Empty = "no outlets assigned". */
  outlets: Outlet[];
  /** Scope to open with (the user's own outlet, or "all"). */
  defaultScope: OutletScope;
  team: BeelivTeam;
}

/* ------------------------------------------------------------------ */
/* Workforce                                                           */
/* ------------------------------------------------------------------ */

export type DepartmentId = "floor-service" | "kitchen" | "bar" | "admin" | "support";
export type ShiftKey = "morning" | "evening" | "night";
export type AttendanceStatus = "present" | "late" | "absent" | "on-leave";

export interface WorkforceMember {
  id: string;
  /** Human-readable display ID (never a key). */
  staffId: string;
  name: string;
  role: string;
  departmentId: DepartmentId;
  outletId: string;
  /** Assignment status is backend-authored; "active" is the only value in the fixture. */
  assignmentStatus: "active" | "ended";
  startDate: ISODate;
  shift: ShiftKey;
  photoUrl: string | null;
}

export interface AttendanceRecord {
  id: string;
  date: ISODate;
  memberId: string;
  staffId: string;
  staffName: string;
  role: string;
  departmentId: DepartmentId;
  outletId: string;
  shift: ShiftKey;
  status: AttendanceStatus;
  /** Recorded clock-in (present / late). Null when absent or on leave. */
  clockIn: ClockTime | null;
}

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

/** Counts for one day. scheduled = present + late + absent + onLeave. */
export interface AttendanceSummary {
  date: ISODate;
  scheduled: number;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  /** present / scheduled, as a percentage with one decimal (display ratio; whether "late" counts as attended is a Beeliv decision - TBD). */
  attendanceRate: number;
}

export type AttendanceTrendPoint = AttendanceSummary;

export interface DepartmentCount {
  departmentId: DepartmentId;
  label: string;
  count: number;
}

export interface ShiftCoverage {
  shift: ShiftKey;
  label: string;
  start: ClockTime;
  end: ClockTime;
  assigned: number;
  /** Required headcount as configured by the backend. TBD whether the final scheduling model has it. */
  required: number;
}

export interface ScheduleDay {
  date: ISODate;
  total: number;
  shifts: Record<ShiftKey, number>;
}

/* ------------------------------------------------------------------ */
/* Recruitment and workforce requests                                  */
/* ------------------------------------------------------------------ */

export type CandidateFeedback = "interested" | "not-suitable" | "interview-requested";

/** Only candidates deliberately submitted by Beeliv HR for Client review. */
export interface CandidateReview {
  id: string;
  name: string;
  position: string;
  outletId: string;
  submittedOn: ISODate;
  experienceSummary: string;
  skills: string[];
  /** null = awaiting the Client's feedback. Feedback informs, never replaces, Beeliv's final approval. */
  feedback: CandidateFeedback | null;
}

export type WorkforceRequestStatus = "submitted" | "under-review" | "in-recruitment" | "candidates-submitted" | "closed";

export interface WorkforceRequest {
  id: string;
  publicId: string;
  outletId: string;
  role: string;
  departmentId: DepartmentId;
  count: number;
  resumptionDate: ISODate;
  /** Backend-authored label (reason taxonomy not approved by Beeliv yet - TBD). */
  reason: string;
  notes: string;
  status: WorkforceRequestStatus;
  submittedOn: ISODate;
  updatedOn: ISODate;
  /** Beeliv updated it since the Client last opened it. */
  hasUpdate: boolean;
}

export interface CandidateComment {
  id: string;
  text: string;
  createdOn: ISODate;
}

/**
 * One submitted candidate in full. Only fields Beeliv has authorised for the
 * Client: no NIN, banking, contact details or private HR notes. `documents`
 * lists the NAMES of approved documents only (no files or values).
 */
export interface CandidateDetail extends CandidateReview {
  profileSummary: string;
  /** Beeliv's own interview / assessment summary, written for the Client. */
  interviewSummary: string;
  documents: string[];
  comments: CandidateComment[];
}

/** Client feedback informs Beeliv; it never approves or hires. */
export interface CandidateFeedbackInput {
  /** Omit to add a comment without changing the decision. */
  feedback?: CandidateFeedback;
  comment?: string;
}

export interface NewWorkforceRequest {
  outletId: string;
  role: string;
  departmentId: DepartmentId;
  count: number;
  resumptionDate: ISODate;
  reason: string;
  notes: string;
}

export type PositionState = "candidates-ready" | "in-progress" | "screening";

/** A client-relevant view of recruitment for one role - never Beeliv's internal pipeline stages. */
export interface RecruitmentPosition {
  id: string;
  title: string;
  outletId: string;
  outletName: string;
  state: PositionState;
  /** Candidates submitted to the Client and awaiting feedback (state "candidates-ready"). */
  candidatesReady: number;
  /** Candidates still with Beeliv (state "screening"). A count only - no names. */
  candidatesScreening: number;
  openings: number;
  requestId: string | null;
}

export interface RecruitmentSummary {
  awaitingFeedback: number;
  /** Sum of `count` over workforce requests that are not closed. */
  openPositions: number;
  positions: RecruitmentPosition[];
}

/* ------------------------------------------------------------------ */
/* Compliance and payroll visibility                                   */
/* ------------------------------------------------------------------ */

export type ComplianceState = "complete" | "outstanding" | "update-required" | "expiring";

export interface ComplianceItem {
  id: string;
  memberId: string;
  staffName: string;
  outletId: string;
  /** An approved operational document (never identity / banking). */
  document: string;
  state: ComplianceState;
  expiresOn: ISODate | null;
}

export interface ComplianceSummary {
  total: number;
  complete: number;
  outstanding: number;
  updateRequired: number;
  expiringSoon: number;
  /** complete / total, rounded DOWN so it never overstates. */
  percentComplete: number;
  /** Items needing attention (everything not complete). */
  attention: ComplianceItem[];
}

export interface PayrollEntry {
  id: string;
  outletId: string;
  outletName: string;
  /** e.g. "October 2026". */
  label: string;
  periodStart: ISODate;
  periodEnd: ISODate;
  scheduledDate: ISODate;
  workforceIncluded: number;
  /** Visibility only - no payment execution, no amounts (salary visibility is pending Beeliv). */
  status: "upcoming" | "completed";
}

export interface PayrollVisibility {
  upcoming: PayrollEntry[];
  history: PayrollEntry[];
}

/* ------------------------------------------------------------------ */
/* Overview composition                                                */
/* ------------------------------------------------------------------ */

export type AttentionKind = "candidates" | "documents" | "request" | "absence";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  count: number;
  title: string;
  detail: string;
  /** Every item leads somewhere. */
  href: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  at: ISODateTime;
  href: string;
  kind: "candidates" | "request" | "compliance" | "schedule";
}

export interface ClientNotification {
  id: string;
  /** Event code from lib/notifications/catalog.ts. Optional: older items are classified by lib/notifications/adapters.ts. */
  kind?: import("@/lib/notifications/catalog").EventCode;
  title: string;
  message: string;
  createdAt: ISODateTime;
  read: boolean;
  href: string;
}

export interface ClientOverview {
  scope: OutletScope;
  /** "Kalina Abuja" or "All Kalina Hospitality outlets". */
  scopeLabel: string;
  /** How the greeting addresses the signed-in user, e.g. "Mr. Adeyemi". */
  greetingName: string;
  /** Selected outlet's cover, when a single outlet is selected. */
  outlet: Outlet | null;
  metrics: AttendanceSummary & { activeStaff: number; openPositions: number };
  /** Members with a recorded clock-in today (present or late). */
  checkedIn: number;
  attention: AttentionItem[];
  team: BeelivTeam;
}

/* ------------------------------------------------------------------ */
/* Workforce detail and schedules (My Workforce / Schedules pages)     */
/* ------------------------------------------------------------------ */

/** Counts over a period (staff-days). Same statuses and meaning as AttendanceSummary, for a range. */
export interface AttendancePeriodSummary extends DateRange {
  scheduled: number;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  /** present / scheduled as a percentage, one decimal (display ratio - same TBD as AttendanceSummary). */
  attendanceRate: number;
}

export interface StaffScheduleEntry {
  date: ISODate;
  shift: ShiftKey;
  start: ClockTime;
  end: ClockTime;
}

/** One line of assignment history. Only what Beeliv shares with the Client (scope TBD). */
export interface AssignmentHistoryEntry {
  id: string;
  outletId: string;
  outletName: string;
  role: string;
  departmentId: DepartmentId;
  from: ISODate;
  /** null = current assignment. */
  to: ISODate | null;
}

/**
 * Everything the staff detail page shows for ONE member, in one call. Contains
 * NO NIN, banking, identity documents or private HR notes - those fields do not
 * exist in the Client contract at all.
 */
export interface WorkforceMemberDetail {
  member: WorkforceMember;
  outletName: string;
  clientName: string;
  /** Attendance over the most recent period the backend chooses (fixture: last 30 days). */
  attendance: AttendancePeriodSummary;
  /** The most recent attendance records, newest first. */
  recentAttendance: AttendanceRecord[];
  upcomingSchedule: StaffScheduleEntry[];
  /** Approved operational documents only (never identity / banking). */
  documents: ComplianceItem[];
  history: AssignmentHistoryEntry[];
}

export interface ScheduledStaff {
  memberId: string;
  name: string;
  role: string;
  departmentId: DepartmentId;
  photoUrl: string | null;
}

/** One shift at one outlet on one day, with who is assigned to it. */
export interface ScheduleShiftEntry {
  id: string;
  date: ISODate;
  shift: ShiftKey;
  label: string;
  start: ClockTime;
  end: ClockTime;
  outletId: string;
  outletName: string;
  assigned: number;
  /** Required headcount as configured by the backend (TBD whether the final scheduling model has it). */
  required: number;
  staff: ScheduledStaff[];
}

export interface ScheduleView {
  /**
   * Whether this Client may edit / create schedules. Backend-authored; Beeliv has NOT
   * confirmed the rule, so the fixture returns false and the UI is read-only.
   */
  canEdit: boolean;
  shifts: ScheduleShiftEntry[];
}

/* ------------------------------------------------------------------ */
/* New-client onboarding (first-time account setup)                    */
/* ------------------------------------------------------------------ */

export type OnboardingStatus = "not-started" | "in-progress" | "complete";

/** Setup steps, in order. Index = position in the /client/setup stepper. */
export type SetupStepId = "welcome" | "details" | "access" | "notifications" | "agreements" | "done";

/** Checklist rows on Overview / the All-set step. `invitation` is done by definition (accepted before setup). */
export type OnboardingItemId = "invitation" | "details" | "access" | "notifications" | "agreements";

export interface OnboardingItem {
  id: OnboardingItemId;
  label: string;
  detail: string;
  done: boolean;
  /** Setup step index to open; null = nothing to do here (already done at invitation). */
  step: number | null;
}

export type PreferredContact = "email" | "phone" | "whatsapp";

export interface ClientContactDetails {
  fullName: string;
  jobTitle: string;
  /** Stored international form "+234 803 555 0142" (PhoneInput). */
  phone: string;
  preferredContact: PreferredContact;
  /** Optional profile photo (data URL until the backend stores uploads). */
  avatarUrl?: string | null;
}

/**
 * The first five are the setup step 4 toggles (kept as-is); the rest are the
 * finer-grained Settings toggles and the two delivery channels (in-app, email;
 * no SMS / WhatsApp). DEV FIXTURE / TBD: Beeliv has not approved the final set.
 */
export type NotificationPrefKey =
  | "candidates"
  | "requests"
  | "attendance"
  | "compliance"
  | "payroll"
  | "interviews"
  | "recruitmentProgress"
  | "staffAssignments"
  | "scheduleChanges"
  | "complianceExpiring"
  | "announcements"
  | "channelInApp"
  | "channelEmail";
export type NotificationPrefs = Record<NotificationPrefKey, boolean>;

export interface AgreementAck {
  id: string;
  title: string;
  acknowledged: boolean;
  /** ISO timestamp the user acknowledged it; null/absent = not yet (or not recorded). */
  acknowledgedAt?: string | null;
  /** Agreement version accepted (TBD: Beeliv supplies real versions). */
  version?: string;
}

export interface ClientOnboarding {
  status: OnboardingStatus;
  /** Step to resume on (0-based). */
  currentStep: number;
  /** The Beeliv contact who invited this user. */
  invitedBy: BeelivTeam;
  items: OnboardingItem[];
  details: ClientContactDetails;
  notifications: NotificationPrefs;
  agreements: AgreementAck[];
}

/** A partial save: the backend merges it and re-derives status / items. */
export interface OnboardingSave {
  currentStep?: number;
  details?: ClientContactDetails;
  notifications?: NotificationPrefs;
  agreements?: AgreementAck[];
  /** Steps the user has completed with this save. */
  completed?: Exclude<OnboardingItemId, "invitation">[];
}
