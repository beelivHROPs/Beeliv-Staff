/**
 * Admin (HR first) data shapes. These are what a Supabase adapter must return,
 * so screens never change when the mock is replaced. Presentation-facing only:
 * no business rules (SLA thresholds, stage mapping rules) live here - the spec
 * (Master Spec v1.5 sections 14, 28, 30.3, 31) is silent on those, so the
 * backend owns them. All people / ids in the mock are FICTIONAL.
 *
 * References (`reference`, `*Ref`, spec 31.1 BLV-xxx-nnnnnn) are generated
 * SERVER-SIDE. Screens only display what the adapter returns: never compose or
 * hardcode one, and never use one as a key or link target. Records are keyed
 * and linked by their internal `id`.
 */

export type ISODateTime = string;

export type LoadStatus = "loading" | "ready" | "empty" | "error" | "restricted";

export interface Loadable<T> {
  data: T | null;
  status: LoadStatus;
  retry: () => void;
}

/* ---------- session, role and scope ---------- */

/** Admin identities share one shell; `hr` is built first, `ops` later (separate role class in admin.css). */
export type AdminRoleId = "hr" | "ops";

/** HR sub-levels named in docs/architecture/data-visibility-matrix.md. What each may do beyond the capabilities below needs Beeliv confirmation. */
export type HrLevel = "Recruiter" | "HR Officer" | "HR Manager";

/**
 * What this HR user may DO. The UI only decides what to show; the real boundary
 * is the backend / RLS. HR submits a selection for approval; the final
 * approve / reject belongs to Head of Operations (rbac.md). HR never gets an
 * "Approve as Staff" action.
 */
export interface HrCapabilities {
  canCreateVacancy: boolean;
  canSubmitForApproval: boolean;
  canApproveSelection: boolean;
}

/** HR is scoped to assigned clients and outlets (data-visibility-matrix). */
export interface AdminScope {
  clients: { id: string; name: string }[];
  outlets: { id: string; clientId: string; name: string }[];
}

export interface AdminSession {
  /** Internal user id (uuid-like). */
  id: string;
  role: AdminRoleId;
  hrLevel: HrLevel;
  /** Internal HR user display reference (server-generated). */
  reference: string;
  user: { firstName: string; lastName: string; avatarUrl?: string | null };
  capabilities: HrCapabilities;
  scope: AdminScope;
}

/* ---------- Overview (spec 14.1) ---------- */

export type HrMetricId = "openVacancies" | "applications" | "shortlisted" | "interviewsPending" | "documentationPending" | "awaitingApproval" | "approvedPlaced";

export type AttentionKind = "documents" | "interviews" | "applications" | "inbox" | "approval";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  detail?: string;
  href: string;
  /** urgent = needs HR action now (red); pending = waiting on someone / in progress (yellow). */
  tone: "urgent" | "pending";
}

export interface PipelineStageCount {
  /** Index into APPLICATION_STAGES (lib/applicant/types.ts). */
  stage: number;
  count: number;
}

export interface UpcomingInterview {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantRef: string;
  vacancy: string;
  at: ISODateTime;
  interviewer: string;
  venue: string;
}

export interface RecentApplication {
  id: string;
  applicantId: string;
  applicationRef: string;
  applicantName: string;
  applicantRef: string;
  vacancy: string;
  /** Client / outlet the vacancy belongs to (display text from the adapter). */
  outlet?: string;
  /** Job location (display text from the adapter). */
  location?: string;
  stage: number;
  submittedAt: ISODateTime;
}

/** Spec 30.3 queue states. */
export type DocQueueStatus = "needs-review" | "missing" | "resubmitted" | "verified";

export interface DocQueueRow {
  id: string;
  personName: string;
  personRef: string;
  docType: string;
  context: string;
  uploadedAt: ISODateTime | null;
  status: DocQueueStatus;
  reviewer: string | null;
}

export interface DocumentationSummary {
  counts: Record<DocQueueStatus, number>;
  rows: DocQueueRow[];
}

/** Spec 28.1 Inbox / Requests sources. */
export type InboxCategory = "contact-enquiries" | "support" | "workforce-requests" | "technical-account";

export interface InboxRow {
  id: string;
  reference: string;
  category: InboxCategory;
  subject: string;
  sender: string;
  receivedAt: ISODateTime;
  assignedTo: string | null;
}

export interface InboxSummary {
  counts: Record<InboxCategory, number>;
  latest: InboxRow[];
}

export type ActivityKind = "application" | "shortlist" | "interview" | "approval" | "document";

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: ISODateTime;
  /** Picks the icon only; optional so older fixtures keep working. */
  kind?: ActivityKind;
}

/** Spec 15 job statuses. */
export type VacancyStatus = "draft" | "pending-approval" | "published" | "paused" | "closing-soon" | "closed" | "filled" | "cancelled";

export interface VacancyOverviewRow {
  id: string;
  title: string;
  /** Departments are configurable (spec 15): display text from the adapter, never a fixed list. */
  department: string;
  /** Client and outlet as display text. */
  outlet: string;
  applicants: number;
  status: VacancyStatus;
}

/** Weekly change shown under a KPI ("4 this week"). Positive = up, negative = down, 0 = no change. The backend owns the window. */
export interface MetricTrend {
  delta: number;
  /** Optional history for the Home hero chart, one array of running totals per range (oldest first). PROTOTYPE data in the mock; the backend owns the real series. */
  series?: Record<"1W" | "1M" | "1Y", number[]>;
}

/** One day of the Attendance Overview. Late / absent rules are backend-owned (spec 24.6). */
export interface AttendanceDay {
  id: string;
  /** "Mon" */
  label: string;
  /** "5 Oct" */
  sub: string;
  /** "Monday, 5 October" */
  title: string;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
}

export interface AttendancePeriod {
  id: string;
  label: string;
  days: AttendanceDay[];
}

export interface DepartmentCount {
  id: string;
  label: string;
  count: number;
}

export interface ClientOutletRow {
  id: string;
  name: string;
  openVacancies: number;
  active: boolean;
}

/** Placement & Onboarding counts. Exact definitions need Beeliv confirmation. */
export interface PlacementSummary {
  approved: number;
  pendingDocs: number;
  onboarding: number;
  activeThisMonth: number;
}

export interface OverviewTask {
  id: string;
  title: string;
  dueAt: ISODateTime | null;
  done: boolean;
  href?: string;
}

export interface TalentPoolSummary {
  count: number;
  topSkills: { label: string; count: number }[];
}

export interface HrOverview {
  metrics: Record<HrMetricId, number>;
  attention: AttentionItem[];
  pipeline: PipelineStageCount[];
  upcomingInterviews: UpcomingInterview[];
  recentApplications: RecentApplication[];
  documentation: DocumentationSummary;
  inbox: InboxSummary;
  activity: ActivityEntry[];
  /** Weekly delta per KPI. */
  trends: Record<HrMetricId, MetricTrend>;
  /** Hero banner photo, supplied later. null = soft gradient fallback. */
  bannerImageUrl: string | null;
  interviewsToday: UpcomingInterview[];
  vacancies: VacancyOverviewRow[];
  attendance: AttendancePeriod[];
  applicantsByDepartment: DepartmentCount[];
  clientsOutlets: ClientOutletRow[];
  placement: PlacementSummary;
  tasks: OverviewTask[];
  talentPool: TalentPoolSummary;
}

/* ---------- chrome ---------- */

export interface AdminNotification {
  id: string;
  /** Event code from lib/notifications/catalog.ts. Optional: older items are classified by lib/notifications/adapters.ts. */
  kind?: import("@/lib/notifications/catalog").EventCode;
  title: string;
  message: string;
  createdAt: ISODateTime;
  read: boolean;
  href: string;
}

/** Sidebar badges: items waiting on THIS user's queue. The exact counting rule needs Beeliv confirmation. */
export interface NavCounts {
  inbox: number;
  documentation: number;
}
