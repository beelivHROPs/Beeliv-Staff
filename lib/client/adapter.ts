/**
 * The replaceable contract between the Client UI and its data source
 * (brief sections 26-27): UI -> hooks -> service -> adapter -> (dev fixture NOW,
 * Supabase adapter LATER: SupabaseClientAnalyticsAdapter). An adapter only
 * fetches; it never lives in a component and it adds no business rules.
 *
 * Every read takes the selected OutletScope. The real adapter must send it to
 * an authorised query / RPC and the backend must re-check it against the
 * user's membership (RLS) - the browser value is only a request, never proof.
 * Response shapes here are what the backend must return, so the UI does not
 * change when the adapter is swapped.
 */
import type {
  ActivityItem,
  AttendanceRecord,
  AttendanceSummary,
  AttendanceTrendPoint,
  CandidateDetail,
  CandidateFeedbackInput,
  CandidateReview,
  NewWorkforceRequest,
  ClientNotification,
  ClientOnboarding,
  ClientOverview,
  OnboardingSave,
  ClientSession,
  ComplianceItem,
  ComplianceSummary,
  DateRange,
  DepartmentCount,
  ISODate,
  OutletScope,
  PayrollVisibility,
  RecruitmentSummary,
  ScheduleDay,
  ScheduleView,
  ShiftCoverage,
  WorkforceMember,
  WorkforceMemberDetail,
  WorkforceRequest,
} from "./types";

/** "reset" = a different dataset (dev state change): hooks show loading again. */
export type AdapterEvent = "reset" | "notifications";

/** Thrown by an adapter when the backend says the user may not see a domain (403 / RLS). */
export class RestrictedError extends Error {
  constructor(message = "Restricted for this account") {
    super(message);
    this.name = "RestrictedError";
  }
}

export interface ClientAnalyticsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;

  getSession(): Promise<ClientSession>;

  // Analytics (aggregates, all derived from the same operational records)
  getOverview(scope: OutletScope): Promise<ClientOverview>;
  getAttendanceSummary(scope: OutletScope, date: ISODate): Promise<AttendanceSummary>;
  getAttendanceTrend(scope: OutletScope, range: DateRange): Promise<AttendanceTrendPoint[]>;
  getWorkforceDistribution(scope: OutletScope): Promise<DepartmentCount[]>;
  getScheduleCoverage(scope: OutletScope, date: ISODate): Promise<ShiftCoverage[]>;
  getWeekSchedule(scope: OutletScope, weekOf: ISODate): Promise<ScheduleDay[]>;
  getRecruitmentSummary(scope: OutletScope): Promise<RecruitmentSummary>;
  getComplianceSummary(scope: OutletScope): Promise<ComplianceSummary>;
  getPayrollVisibility(scope: OutletScope): Promise<PayrollVisibility>;
  getRecentActivity(scope: OutletScope): Promise<ActivityItem[]>;
  getNotifications(scope: OutletScope): Promise<ClientNotification[]>;
  /** Marks read for the signed-in user. Emits "notifications" so unread badges refresh without a loading flash. */
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  deleteNotification(id: string): Promise<void>;

  // Records (what the analytics drill into)
  getWorkforce(scope: OutletScope): Promise<WorkforceMember[]>;
  getAttendanceRecords(scope: OutletScope, range: DateRange): Promise<AttendanceRecord[]>;
  getCandidates(scope: OutletScope): Promise<CandidateReview[]>;
  getWorkforceRequests(scope: OutletScope): Promise<WorkforceRequest[]>;
  getDocuments(scope: OutletScope): Promise<ComplianceItem[]>;
  /** null = no such member in this scope (the backend answers the same for "not yours"). */
  getWorkforceMemberDetail(scope: OutletScope, memberId: string): Promise<WorkforceMemberDetail | null>;
  getSchedule(scope: OutletScope, range: DateRange): Promise<ScheduleView>;

  // Recruitment / Requests additions (writes emit "notifications" so open lists refresh quietly) (single records and Client-side writes)
  getCandidate(scope: OutletScope, id: string): Promise<CandidateDetail | null>;
  /** Records Client feedback / a comment. Informs Beeliv only - never approves or hires. */
  submitCandidateFeedback(scope: OutletScope, id: string, input: CandidateFeedbackInput): Promise<void>;
  getWorkforceRequest(scope: OutletScope, id: string): Promise<WorkforceRequest | null>;
  /** Creates a Workforce Request for Beeliv HR to review. Never publishes a vacancy. */
  createWorkforceRequest(scope: OutletScope, input: NewWorkforceRequest): Promise<WorkforceRequest>;
  /** Reason list for the request form. TBD: taxonomy not approved by Beeliv. */
  getWorkforceRequestReasons(): Promise<string[]>;

  /**
   * First-time account setup progress (the invitation was already accepted; sign-in is handled by
   * the Client auth, TBD). status "complete" = nothing left to show. Saves emit "notifications"
   * so open screens refresh quietly.
   */
  getOnboarding(): Promise<ClientOnboarding>;
  saveOnboarding(input: OnboardingSave): Promise<ClientOnboarding>;
}
