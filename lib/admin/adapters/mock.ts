/**
 * DEV FIXTURE for the HR Admin app. Everything here is FICTIONAL ("Sample"
 * people, "Demo" clients). The `BLV-...` references are PLACEHOLDERS standing
 * in for server-generated values: a Supabase adapter returns the real ones and
 * screens never build their own. Replace this whole file with a Supabase
 * adapter implementing AdminAdapter; no screen changes.
 */
import { canDo } from "../role-access";
import { isoOffset } from "@/lib/applicant/time";
import type { AdminAdapter, AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { readRequests, subscribeRequests } from "@/lib/bridge/interview-requests";
import { getAdminIdentity } from "../ops/identity";
import { getAdminScope, textInScope } from "../scope";
import { talentPoolSummary } from "../talent-pool/mock";
import type { AdminNotification, AdminSession, DocQueueRow, HrOverview, InboxRow, NavCounts, PipelineStageCount } from "../types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const listeners = new Set<(e: AdapterEvent) => void>();
// A candidate request sent from the Applicant app (or answered by HR) refreshes the bell and the Inbox badge.
if (typeof window !== "undefined") subscribeRequests(() => listeners.forEach((l) => l("reset")));
subscribePrototypeMode(() => listeners.forEach((l) => l("reset")));

/** The "loading" scenario never resolves, so the skeleton stays visible. */
const forever = () => new Promise<never>(() => {});

const SESSION: AdminSession = {
  id: "7d2c1f0e-0000-4000-8000-00000000a001",
  role: "hr",
  hrLevel: "HR Officer",
  reference: "BLV-HR-PLACEHOLDER-1",
  user: { firstName: "Funke", lastName: "Sample", avatarUrl: null },
  // HR submits for approval; Head of Operations approves. HR has no approve action anywhere.
  capabilities: { canCreateVacancy: true, canSubmitForApproval: true, canApproveSelection: false },
  scope: {
    clients: [
      { id: "c-demo-hotel", name: "Demo Hotel Abuja" },
      { id: "c-demo-lounge", name: "Demo Lounge Lagos" },
    ],
    outlets: [
      { id: "o-demo-hotel-main", clientId: "c-demo-hotel", name: "Main building" },
      { id: "o-demo-lounge-vi", clientId: "c-demo-lounge", name: "Victoria Island" },
    ],
  },
};

/** PROTOTYPE: a fictional HR Manager (company-wide HR). Never a real person. */
const MANAGER_SESSION: AdminSession = {
  id: "7d2c1f0e-0000-4000-8000-00000000a009",
  role: "hr",
  hrLevel: "HR Manager",
  reference: "BLV-HR-PLACEHOLDER-9",
  user: { firstName: "Ifeoma", lastName: "Sample", avatarUrl: null },
  capabilities: { canCreateVacancy: true, canSubmitForApproval: true, canApproveSelection: false },
  scope: {
    clients: [
      ...SESSION.scope.clients,
      { id: "c-demo-cafe", name: "Demo Cafe Port Harcourt" },
      { id: "c-demo-events", name: "Demo Events Centre Kano" },
    ],
    outlets: [
      ...SESSION.scope.outlets,
      { id: "o-demo-cafe-ph", clientId: "c-demo-cafe", name: "Port Harcourt" },
      { id: "o-demo-events-kano", clientId: "c-demo-events", name: "Main hall" },
    ],
  },
};
/** PROTOTYPE: the HR officer with nothing assigned yet (previews the empty scope state). */
const UNASSIGNED_SESSION: AdminSession = { ...SESSION, scope: { clients: [], outlets: [] } };

/** Counts per APPLICATION_STAGES index. Applications / awaiting approval / placed are derived from this so the numbers agree. */
const PIPELINE: PipelineStageCount[] = [34, 18, 9, 7, 5, 4, 3, 2].map((count, stage) => ({ stage, count }));

const DOC_ROWS: DocQueueRow[] = [
  { id: "d-1", personName: "Ada Sample", personRef: "BLV-APP-PLACEHOLDER-1", docType: "Guarantor form", context: "Waiter / Waitress, Demo Hotel Abuja", uploadedAt: isoOffset(0, 8, 40), status: "resubmitted", reviewer: "Funke Sample" },
  { id: "d-2", personName: "Tunde Sample", personRef: "BLV-APP-PLACEHOLDER-2", docType: "CV", context: "Commis Chef, Demo Lounge Lagos", uploadedAt: isoOffset(-1, 15, 5), status: "needs-review", reviewer: null },
  { id: "d-3", personName: "Chidi Sample", personRef: "BLV-APP-PLACEHOLDER-3", docType: "Reference letter", context: "Bar Attendant, Demo Lounge Lagos", uploadedAt: null, status: "missing", reviewer: "Funke Sample" },
  { id: "d-4", personName: "Bisi Sample", personRef: "BLV-APP-PLACEHOLDER-4", docType: "Passport photograph", context: "Waiter / Waitress, Demo Hotel Abuja", uploadedAt: isoOffset(-2, 11, 20), status: "needs-review", reviewer: null },
];

const INBOX_ROWS: InboxRow[] = [
  { id: "i-1", reference: "BLV-WFR-PLACEHOLDER-1", category: "workforce-requests", subject: "Request for 3 banquet servers", sender: "Demo Hotel Abuja", receivedAt: isoOffset(0, 9, 10), assignedTo: "Funke Sample" },
  { id: "i-2", reference: "BLV-SUP-PLACEHOLDER-1", category: "support", subject: "Question about a placement start date", sender: "Demo Lounge Lagos", receivedAt: isoOffset(-1, 16, 30), assignedTo: null },
  { id: "i-3", reference: "BLV-ENQ-PLACEHOLDER-1", category: "contact-enquiries", subject: "Training enquiry for a new cafe team", sender: "Sample Cafe (public form)", receivedAt: isoOffset(-2, 10, 0), assignedTo: null },
];

const NOTIFICATIONS: AdminNotification[] = [
  { id: "n-1", kind: "document.resubmitted", title: "Document resubmitted", message: "Ada Sample resubmitted a guarantor form.", createdAt: isoOffset(0, 8, 41), read: false, href: "/admin/recruitment/documentation?status=resubmitted" },
  { id: "n-2", kind: "client.request", title: "New workforce request", message: "Demo Hotel Abuja asked for 3 banquet servers.", createdAt: isoOffset(0, 9, 11), read: false, href: "/admin/inbox?category=workforce-requests" },
  { id: "n-3", kind: "application.new", title: "New application", message: "Tunde Sample applied for Commis Chef.", createdAt: isoOffset(-1, 14, 2), read: true, href: "/admin/recruitment/applicants" },
];

/**
 * Candidates who said "Can't make this time" (Applicant mock, lib/bridge/interview-requests.ts). One bell item
 * per request, unread until HR changes the interview. Backend: a notification row created with the Inbox case.
 */
function cantAttendNotifications(): AdminNotification[] {
  return readRequests().map((r) => ({
    id: `n-cant-${r.id}`,
    kind: "interview.cant_attend" as const,
    title: "Candidate cannot make an interview time",
    message: `${r.applicantName} can't make ${r.title} (${r.applicationLabel}).`,
    createdAt: r.requestedAt,
    read: r.status !== "open",
    href: `/admin/inbox/case-cant-${r.id}`,
  }));
}

/** present, late, absent, on leave: Monday to Sunday. Fixture numbers only. */
const ATTENDANCE_NUMBERS: [number, number, number, number][] = [
  [17, 2, 1, 2],
  [30, 4, 2, 2],
  [24, 3, 1, 2],
  [32, 5, 2, 1],
  [27, 4, 2, 3],
  [14, 3, 2, 6],
  [9, 2, 1, 6],
];

/** Seven days of the week that starts `weeksAgo` weeks before this Monday. Labels are real calendar dates. */
function attendanceWeek(weeksAgo: number, id: string, label: string, tweak: number): HrOverview["attendance"][number] {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) - weeksAgo * 7);
  return {
    id,
    label,
    days: ATTENDANCE_NUMBERS.map(([present, late, absent, onLeave], i) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      return {
        id: `${id}-${i}`,
        label: d.toLocaleDateString("en-GB", { weekday: "short" }),
        sub: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).replace("Sept", "Sep"),
        title: d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
        present: present - tweak,
        late: late + tweak,
        absent,
        onLeave,
      };
    }),
  };
}

const VACANCY_ROWS: HrOverview["vacancies"] = [
  { id: "v-waiter", title: "Waiter / Waitress", department: "Floor / Service", outlet: "Demo Hotel Abuja, Main building", applicants: 14, status: "published" },
  { id: "v-chef", title: "Commis Chef", department: "Kitchen", outlet: "Demo Lounge Lagos, Victoria Island", applicants: 9, status: "closing-soon" },
  { id: "v-bar", title: "Bar Attendant", department: "Bar", outlet: "Demo Lounge Lagos, Victoria Island", applicants: 11, status: "published" },
  { id: "v-desk", title: "Front Desk Officer", department: "Management / Operations", outlet: "Demo Hotel Abuja, Main building", applicants: 6, status: "pending-approval" },
  { id: "v-floor", title: "Floor Supervisor", department: "Management / Operations", outlet: "Demo Hotel Abuja, Main building", applicants: 4, status: "published" },
];

function overview(): HrOverview {
  const stage = (i: number) => PIPELINE[i].count;
  const interviews: HrOverview["upcomingInterviews"] = [
    { id: "iv-1", applicantId: "a-uuid-0001", applicantName: "Ada Sample", applicantRef: "BLV-APP-PLACEHOLDER-1", vacancy: "Waiter / Waitress", at: isoOffset(0, 10, 30), interviewer: "Folake Sample", venue: "Beeliv office, Abuja" },
    { id: "iv-2", applicantId: "a-uuid-0002", applicantName: "Tunde Sample", applicantRef: "BLV-APP-PLACEHOLDER-2", vacancy: "Commis Chef", at: isoOffset(0, 14, 0), interviewer: "Folake Sample", venue: "Video call" },
    { id: "iv-3", applicantId: "a-uuid-0005", applicantName: "Kemi Sample", applicantRef: "BLV-APP-PLACEHOLDER-5", vacancy: "Host / Hostess", at: isoOffset(1, 11, 0), interviewer: "Funke Sample", venue: "Beeliv office, Abuja" },
  ];
  const dayKey = (iso: string) => new Date(iso).toDateString();
  const counts = { "needs-review": 2, missing: 1, resubmitted: 1, verified: 11 };
  return {
    metrics: {
      openVacancies: VACANCY_ROWS.filter((v) => v.status === "published" || v.status === "closing-soon").length,
      applications: PIPELINE.reduce((n, p) => n + p.count, 0),
      shortlisted: 12,
      interviewsPending: 6,
      documentationPending: counts["needs-review"] + counts.missing + counts.resubmitted,
      awaitingApproval: stage(5),
      approvedPlaced: stage(6) + stage(7),
    },
    attention: [
      { id: "a-1", kind: "documents", tone: "urgent", title: "1 document was resubmitted", detail: "Ada Sample, Guarantor form", href: "/admin/recruitment/documentation?status=resubmitted" },
      { id: "a-2", kind: "interviews", tone: "urgent", title: "2 interviews are today", detail: "First at 10:30 AM", href: "/admin/recruitment/interviews?status=pending" },
      { id: "a-3", kind: "inbox", tone: "urgent", title: "2 inbox items have no assignee", href: "/admin/inbox" },
      { id: "a-4", kind: "approval", tone: "pending", title: `${stage(5)} selections await Head of Operations`, detail: "Submitted for approval. Nothing for you to do yet.", href: "/admin/recruitment/applicants?stage=selection-approval" },
    ],
    pipeline: PIPELINE,
    upcomingInterviews: interviews,
    recentApplications: ([
      { id: "ap-1", applicantId: "a-uuid-0006", applicationRef: "BLV-APL-PLACEHOLDER-1", applicantName: "Dayo Sample", applicantRef: "BLV-APP-PLACEHOLDER-6", vacancy: "Bar Attendant", outlet: "Demo Lounge Lagos", location: "Lagos", stage: 0, submittedAt: isoOffset(0, 7, 55) },
      { id: "ap-2", applicantId: "a-uuid-0007", applicationRef: "BLV-APL-PLACEHOLDER-2", applicantName: "Hauwa Sample", applicantRef: "BLV-APP-PLACEHOLDER-7", vacancy: "Waiter / Waitress", outlet: "Demo Hotel Abuja", location: "Abuja", stage: 0, submittedAt: isoOffset(-1, 18, 20) },
      { id: "ap-3", applicantId: "a-uuid-0002", applicationRef: "BLV-APL-PLACEHOLDER-3", applicantName: "Tunde Sample", applicantRef: "BLV-APP-PLACEHOLDER-2", vacancy: "Commis Chef", outlet: "Demo Lounge Lagos", location: "Lagos", stage: 2, submittedAt: isoOffset(-3, 12, 0) },
      { id: "ap-4", applicantId: "a-uuid-0001", applicationRef: "BLV-APL-PLACEHOLDER-4", applicantName: "Ada Sample", applicantRef: "BLV-APP-PLACEHOLDER-1", vacancy: "Waiter / Waitress", outlet: "Demo Hotel Abuja", location: "Abuja", stage: 3, submittedAt: isoOffset(-5, 10, 0) },
    ] as HrOverview["recentApplications"]).filter((a) => textInScope(a.outlet)),
    documentation: { counts, rows: DOC_ROWS.filter((r) => textInScope(r.context)) },
    inbox: {
      counts: { "contact-enquiries": 1, support: 1, "workforce-requests": 1, "technical-account": 0 },
      // Cases that name a client follow the scope; public enquiries have no client and stay.
      latest: INBOX_ROWS.filter((r) => r.category === "contact-enquiries" || textInScope(r.sender)),
    },
    activity: [
      { id: "ac-1", actor: "Funke Sample", action: "shortlisted", target: "Ada Sample for Waiter / Waitress", at: isoOffset(0, 9, 5), kind: "shortlist" },
      { id: "ac-2", actor: "Folake Sample", action: "scheduled an interview with", target: "Kemi Sample", at: isoOffset(-1, 17, 40), kind: "interview" },
      { id: "ac-3", actor: "Funke Sample", action: "submitted for approval", target: "Chidi Sample, Bar Attendant", at: isoOffset(-2, 13, 15), kind: "approval" },
      { id: "ac-4", actor: "Ada Sample", action: "resubmitted", target: "Guarantor form", at: isoOffset(0, 8, 40), kind: "document" },
    ],
    // Weekly deltas (fixture values; the backend owns the window and the maths).
    trends: {
      openVacancies: { delta: 1 },
      // series: PROTOTYPE history for the Home hero chart (fictional running totals, oldest first). Real series comes from the backend.
      applications: { delta: 12, series: { "1W": [73, 72, 75, 74, 78, 80, 82], "1M": [58, 61, 60, 66, 69, 73, 82], "1Y": [12, 20, 27, 31, 39, 46, 52, 58, 64, 71, 76, 82] } },
      shortlisted: { delta: 4 },
      interviewsPending: { delta: -2 },
      documentationPending: { delta: 3 },
      awaitingApproval: { delta: 0 },
      approvedPlaced: { delta: 1 },
    },
    bannerImageUrl: null,
    interviewsToday: interviews.filter((iv) => dayKey(iv.at) === dayKey(new Date().toISOString())),
    vacancies: VACANCY_ROWS.filter((v) => textInScope(v.outlet)),
    attendance: [attendanceWeek(0, "this-week", "This week", 0), attendanceWeek(1, "last-week", "Last week", 1)],
    applicantsByDepartment: [
      { id: "floor", label: "Floor / Service", count: 34 },
      { id: "kitchen", label: "Kitchen", count: 24 },
      { id: "bar", label: "Bar", count: 15 },
      { id: "mgmt", label: "Management / Operations", count: 9 },
    ],
    clientsOutlets: [
      { id: "c-demo-hotel", name: "Demo Hotel Abuja", openVacancies: 2, active: true },
      { id: "c-demo-lounge", name: "Demo Lounge Lagos", openVacancies: 2, active: true },
    ].filter((c) => textInScope(c.name)),
    // Approved = approvedPlaced (onboarding + assignment stages); the other three are fixture values. Definitions need Beeliv confirmation.
    placement: { approved: stage(6) + stage(7), pendingDocs: 2, onboarding: stage(6), activeThisMonth: stage(7) },
    tasks: [
      { id: "t-1", title: "Review resubmitted guarantor form", dueAt: isoOffset(0, 12, 0), done: false, href: "/admin/recruitment/documentation?status=resubmitted" },
      { id: "t-2", title: "Confirm interview panel for Commis Chef", dueAt: isoOffset(0, 16, 0), done: false },
      { id: "t-3", title: "Assign the two unassigned inbox items", dueAt: isoOffset(1, 10, 0), done: false, href: "/admin/inbox" },
      { id: "t-4", title: "Send shortlist to Demo Hotel Abuja", dueAt: isoOffset(-1, 15, 0), done: true },
    ],
    talentPool: talentPoolSummary(),
  };
}

/** The same workspace with nothing in it: every number zero, every list empty. */
const metrics0: HrOverview["metrics"] = { openVacancies: 0, applications: 0, shortlisted: 0, interviewsPending: 0, documentationPending: 0, awaitingApproval: 0, approvedPlaced: 0 };

function emptyOverview(): HrOverview {
  return {
    metrics: metrics0,
    attention: [],
    pipeline: PIPELINE.map((p) => ({ stage: p.stage, count: 0 })),
    upcomingInterviews: [],
    recentApplications: [],
    documentation: { counts: { "needs-review": 0, missing: 0, resubmitted: 0, verified: 0 }, rows: [] },
    inbox: { counts: { "contact-enquiries": 0, support: 0, "workforce-requests": 0, "technical-account": 0 }, latest: [] },
    activity: [],
    trends: Object.fromEntries((Object.keys(metrics0) as (keyof typeof metrics0)[]).map((k) => [k, { delta: 0 }])) as HrOverview["trends"],
    bannerImageUrl: null,
    interviewsToday: [],
    vacancies: [],
    attendance: [],
    applicantsByDepartment: [],
    clientsOutlets: [],
    placement: { approved: 0, pendingDocs: 0, onboarding: 0, activeThisMonth: 0 },
    tasks: [],
    talentPool: { count: 0, topSkills: [] },
  };
}

export const mockAdminAdapter: AdminAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async getSession() {
    await sleep(120);
    const who = getAdminIdentity();
    const base = who === "hr-manager" ? MANAGER_SESSION : who === "hr-officer-none" ? UNASSIGNED_SESSION : SESSION;
    // The assigned officer does not create vacancies (proposal, needs Beeliv confirmation; lib/admin/role-access.ts).
    return { ...base, capabilities: { ...base.capabilities, canCreateVacancy: canDo("vacancy.create") } };
  },

  async getHrOverview() {
    const mode = getPrototypeMode();
    if (mode === "loading") return forever();
    await sleep(350);
    if (mode === "error") throw new Error("Dev fixture: simulated failure");
    // An HR officer with no assigned client sees an empty workspace (the page explains why).
    return mode === "empty" || getAdminScope().none ? emptyOverview() : overview();
  },

  async getNotifications() {
    await sleep(150);
    return getPrototypeMode() === "empty" || getAdminScope().none ? [] : [...cantAttendNotifications(), ...NOTIFICATIONS].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getNavCounts(): Promise<NavCounts> {
    await sleep(150);
    if (getPrototypeMode() === "empty" || getAdminScope().none) return { inbox: 0, documentation: 0 };
    // Items waiting for action in the Inbox: the sample three plus each open "Can't attend" request.
    return { inbox: 3 + readRequests().filter((r) => r.status === "open").length, documentation: 4 };
  },
};
