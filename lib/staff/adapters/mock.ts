/**
 * ====================================================================
 *  DEV FIXTURE - NOT REAL DATA. Delete when the Supabase adapter lands.
 * ====================================================================
 * The only place Staff sample data lives. Persona: Sarah Okafor, Floor
 * Manager at Kalina, Abuja - continuing the Applicant persona (staff ID
 * BLV-STF-00127). IDs below are fixed fixture strings; nothing generates
 * IDs in the browser. Dates are computed relative to "today" so the demo
 * always looks current.
 *
 * It stands in for the BACKEND, so it (not the UI) decides fixture facts
 * such as the attendance state and leave summary. Which scenario is served
 * is picked by the dev "Prototype state" control (lib/staff/dev-controls.ts).
 */
import type { AdapterEvent, StaffAdapter } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode, type PrototypeMode } from "../dev-controls";
import { addDays, todayISO } from "../format";
import { buildSopItems, extraSopAssignments, seedReceipts } from "../sops/mock";
import type { SopItem, SopReceipt } from "../sops/types";
import { EMPTY_PERSONAL, isValidNin, isValidNuban, personalComplete } from "../personal-details";
import type {
  AccessibilityInput,
  Agreement,
  AgreementAcceptance,
  Announcement,
  AttendanceRecord,
  BankDetailsInput,
  Entitlements,
  LeaveRequest,
  LeaveRequestInput,
  NavCounts,
  NextOfKinInput,
  NinInput,
  Notification,
  OnboardingItem,
  RequiredAction,
  SOPAssignment,
  SensitiveState,
  Shift,
  StaffAssignment,
  StaffDocument,
  StaffEmployer,
  StaffEmployment,
  StaffHome,
  StaffPersonalDetails,
  StaffProfile,
  StaffRecord,
  StaffSensitiveStatus,
  TodayAttendance,
  TrainingAssignment,
} from "../types";

type Db = {
  mode: PrototypeMode;
  profile: StaffProfile;
  /** Personal details, employment and the MASKED sensitive status. Empty by default; no sample values. */
  personal: StaffPersonalDetails;
  employment: StaffEmployment;
  sensitive: StaffSensitiveStatus;
  assignments: StaffAssignment[];
  shifts: Shift[];
  today: TodayAttendance;
  attendance: AttendanceRecord[];
  leave: LeaveRequest[];
  documents: StaffDocument[];
  sops: SOPAssignment[];
  /** Per-person SOP read receipts (new data need; see lib/staff/sops). */
  sopReceipts: SopReceipt[];
  training: TrainingAssignment[];
  records: StaffRecord[];
  announcements: Announcement[];
  notifications: Notification[];
  agreements: Agreement[];
  acceptances: AgreementAcceptance[];
};

const at = (date: string, time: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi).toISOString();
};

function makeShift(offset: number, id: string, notes: string | null = null, status: Shift["status"] = "scheduled"): Shift {
  const date = addDays(todayISO(), offset);
  return {
    id,
    date,
    startTime: "10:00",
    endTime: "18:00",
    client: "Kalina",
    outlet: "Kalina, Abuja",
    location: "Abuja",
    role: "Floor Manager",
    section: "Front of house",
    status,
    notes,
    agenda: [
      { time: "09:30", label: "Team briefing", detail: "Restaurant lounge", kind: "task" },
      { time: "10:00", label: "Shift start", detail: "Front of house", kind: "start" },
      { time: "13:00", label: "Break", detail: "1 hour", kind: "break" },
      { time: "14:00", label: "Floor service", detail: "Main dining", kind: "task" },
      { time: "18:00", label: "Shift end", detail: null, kind: "end" },
    ],
  };
}

/** DEV FIXTURE section titles for withDevSections (declared before makeDb runs at module load). */
const DEV_SECTION_TITLES = ["Purpose", "Before service", "During service", "Closing", "Summary"];

function makeDb(mode: PrototypeMode): Db {
  const today = todayISO();
  const hasShiftToday = mode !== "no-shift" && mode !== "onboarding" && mode !== "no-assignment";
  const todayShift = hasShiftToday ? makeShift(0, "shf-today", "Lunch service, private booking at 13:00.") : null;

  const assignment: StaffAssignment = {
    id: "asg-kalina",
    status: mode === "onboarding" ? "upcoming" : "active",
    client: { id: "cli-kalina", name: "Kalina" },
    outlet: { id: "out-kalina-abuja", publicId: "BLV-OUT-000004", name: "Kalina Restaurant & Lounge", location: "Abuja", imageUrl: null },
    role: "Floor Manager",
    department: "Front of house",
    tags: ["Full-time", "Front of house", "Kalina"],
    supervisor: { name: "Mr. Ade Bello", title: "General Manager", email: null, phone: null },
    beelivContact: { name: "Beeliv HR team", title: "Workforce support", email: "hr@example.com", phone: null },
    startDate: mode === "onboarding" ? addDays(today, 6) : addDays(today, -74),
    endDate: null,
    context: "Full-service dining and lounge. Dress code and service standards are covered in your assigned SOPs.",
    // FIXTURE (onboarding only): placeholder first-day briefing, not Beeliv wording. Backend need.
    firstDay: mode === "onboarding" ? { time: "09:00", bring: ["A valid photo ID", "Black, closed shoes"] } : null,
  };

  // An earlier, ended assignment so the history list has something to show.
  const previousAssignment: StaffAssignment = {
    id: "asg-previous",
    status: "ended",
    client: { id: "cli-harbour", name: "Harbour Bistro" },
    outlet: { id: "out-harbour-abuja", publicId: "BLV-OUT-000002", name: "Harbour Bistro", location: "Abuja", imageUrl: null },
    role: "Service Supervisor",
    department: "Front of house",
    tags: ["Full-time"],
    supervisor: null,
    beelivContact: null,
    startDate: addDays(today, -400),
    endDate: addDays(today, -80),
    context: null,
  };

  const shifts: Shift[] =
    mode === "no-assignment"
      ? []
      : [
          ...(todayShift ? [todayShift] : []),
          ...(mode === "onboarding" ? [] : [
            // Past shifts (completed) back the attendance history; one updated and one cancelled show every status.
            ...[-6, -5, -3, -2, -1].map((o, i) => makeShift(o, `shf-past-${i}`, null, "completed")),
            makeShift(1, "shf-1"),
            makeShift(3, "shf-3", "Start time moved from 09:00 to 10:00. Inventory count after close.", "updated"),
            makeShift(4, "shf-4"),
            makeShift(6, "shf-6", "Cancelled by the outlet - no cover needed.", "cancelled"),
            makeShift(9, "shf-9"),
            makeShift(12, "shf-12"),
          ]),
        ];

  const todayAtt: TodayAttendance = todayShift
    ? { state: "ready", shift: todayShift, checkedInAt: null, checkedOutAt: null, attentionReason: null }
    : { state: "no-shift", shift: null, checkedInAt: null, checkedOutAt: null, attentionReason: null };

  const attendance: AttendanceRecord[] =
    mode === "onboarding" || mode === "no-assignment"
      ? []
      : [-6, -5, -3, -2, -1].map((o, i) => ({
          id: `att-${i}`,
          date: addDays(today, o),
          shiftId: `shf-past-${i}`,
          checkedInAt: at(addDays(today, o), "09:58"),
          checkedOutAt: at(addDays(today, o), "18:03"),
          // One record needs attention so the history shows that state (no lateness rule implied).
          ...(o === -5 ? { checkedOutAt: null } : {}),
          status: o === -5 ? ("attention" as const) : ("recorded" as const),
        }));

  const leave: LeaveRequest[] =
    mode === "onboarding"
      ? []
      : [
          { id: "lv-1", type: "Annual leave", startDate: addDays(today, 14), endDate: addDays(today, 18), reason: "Family visit", status: "approved", submittedAt: at(addDays(today, -9), "11:20"), decisionNote: null, attachmentName: null, canCancel: true },
          { id: "lv-2", type: "Personal leave", startDate: addDays(today, 30), endDate: addDays(today, 30), reason: null, status: "pending", submittedAt: at(addDays(today, -1), "16:45"), decisionNote: null, attachmentName: null, canCancel: true },
        ];

  const documents: StaffDocument[] =
    mode === "onboarding"
      ? [{ id: "doc-photo", name: "Passport photograph", group: "identity", status: "required", dueDate: addDays(today, 2), fileName: null, updatedAt: null, requestNote: null }]
      : [
          { id: "doc-food", name: "Food handler certificate", group: "certificates", status: "update-required", dueDate: addDays(today, 3), fileName: "food-handler-2024.pdf", updatedAt: at(addDays(today, -300), "10:00"), requestNote: "Please upload your renewed certificate." },
          { id: "doc-id", name: "Identity document", group: "identity", status: "verified", dueDate: null, fileName: "identity.pdf", updatedAt: at(addDays(today, -70), "10:00"), requestNote: null },
        ];

  const sopsBase: SOPAssignment[] = mode === "onboarding" ? [] : [
    { id: "sa-hygiene", sop: { id: "sop-hygiene", title: "Kitchen hygiene basics", category: "Safety", description: "Hand washing, surface cleaning and storage.", version: "v1", department: null, requiresAcknowledgement: false }, assignedAt: addDays(today, -30), dueDate: null, required: false, progress: 100, status: "completed", acknowledged: false },
    { id: "sa-fire", sop: { id: "sop-fire", title: "Fire safety & evacuation", category: "Safety", description: "Updated evacuation routes and roles.", version: "v3", department: null, requiresAcknowledgement: true }, assignedAt: addDays(today, -2), dueDate: addDays(today, 5), required: true, progress: 0, status: "assigned", acknowledged: false },
    { id: "sa-table", sop: { id: "sop-table", title: "Table service standards", category: "Service", description: "Greeting, order taking and clearing.", version: "v2", department: "Front of house", requiresAcknowledgement: true }, assignedAt: addDays(today, -12), dueDate: addDays(today, 10), required: true, progress: 40, status: "in-progress", acknowledged: false },
  ];
  const sops = [...sopsBase, ...(mode === "onboarding" ? [] : extraSopAssignments(today))].map(withDevSections);

  const training: TrainingAssignment[] = mode === "onboarding" ? [] : [
    { id: "ta-guest", training: { id: "trn-guest", title: "Guest experience essentials", type: "course", category: "Service", description: "Core service behaviours.", durationMinutes: 45 }, assignedAt: addDays(today, -15), dueDate: addDays(today, 9), required: true, progress: 60, status: "in-progress" },
  ];

  const agreements: Agreement[] = [
    { id: "agr-conduct", title: "Staff Welfare, HR & Workplace Policy Standard", version: "BH-HR-001 v1.0", summary: "I confirm that I have received, read and understood the Beeliv Hospitality Staff Welfare, HR & Workplace Policy Standard and agree to comply with the applicable requirements.", required: true },
    { id: "agr-privacy", title: "Data & privacy consent", version: "1.0", summary: "How Beeliv handles your personal information.", required: true },
  ];

  const status: StaffProfile["accountStatus"] =
    mode === "onboarding" ? "onboarding"
    : mode === "invitation-required" ? "invitation-required"
    : mode === "invitation-expired" ? "invitation-expired"
    : mode === "suspended" ? "suspended"
    : "active";

  return {
    mode,
    profile: {
      id: "person-sarah",
      staffId: "BLV-STF-00127",
      firstName: "Sarah",
      lastName: "Okafor",
      preferredName: null,
      email: "sarah.okafor@example.com",
      phone: null,
      avatarUrl: null,
      roleLabel: "Assigned staff",
      accountStatus: status,
    },
    personal: { ...EMPTY_PERSONAL },
    employment: { current: null, previous: null },
    sensitive: {
      nextOfKin: { state: "empty", maskedName: null, maskedPhone: null, updatedAt: null },
      nin: { state: "empty", masked: null, updatedAt: null },
      bank: { state: "empty", maskedAccount: null, updatedAt: null },
      accessibility: { state: "empty", updatedAt: null },
    },
    assignments: mode === "no-assignment" ? [] : [assignment, previousAssignment],
    shifts,
    today: mode === "no-assignment" ? { ...todayAtt, state: "no-shift" } : todayAtt,
    attendance,
    leave,
    documents,
    sops,
    sopReceipts: mode === "onboarding" ? [] : seedReceipts(),
    training,
    // FIXTURE (Records page): neutral, Beeliv-authored labels. Onboarding staff have none.
    records: mode === "onboarding" ? [] : [
      { id: "rec-1", date: addDays(today, -4), type: "Attendance follow-up", status: "open", summary: "Beeliv has noted a difference between your recorded and scheduled times on one day. Please review and acknowledge.", requiresAcknowledgement: true },
      { id: "rec-2", date: addDays(today, -40), type: "Service standards note", status: "closed", summary: "A short note from your supervisor about table service standards. No further action is needed.", requiresAcknowledgement: false },
    ],
    announcements: [
      { id: "an-menu", title: "New menu launch", body: "The autumn menu goes live this Friday. Tasting and briefing on Thursday at 09:30.", source: "outlet", publishedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(), imageUrl: null },
      { id: "an-uniform", title: "Uniform refresh", body: "New aprons are available from the outlet office.", source: "beeliv", publishedAt: new Date(Date.now() - 6 * 86_400_000).toISOString(), imageUrl: null },
    ],
    notifications: mode === "onboarding" ? [] : [
      { id: "nt-1", event: "shift-updated", title: "Your Tuesday shift has been updated.", message: "Start time is now 10:00 AM.", destination: { href: "/staff/schedule", label: "View schedule" }, read: false, createdAt: new Date(Date.now() - 40 * 60_000).toISOString() },
      { id: "nt-2", event: "sop-assigned", title: "A new SOP has been assigned.", message: "Fire safety & evacuation (v3).", destination: { href: "/staff/sops-training", label: "View SOP" }, read: false, createdAt: new Date(Date.now() - 5 * 3_600_000).toISOString() },
      { id: "nt-3", event: "document-requested", title: "Beeliv requires an updated document.", message: "Food handler certificate.", destination: { href: "/staff/documents", label: "Upload document" }, read: true, createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString() },
    ],
    agreements,
    acceptances: [],
  };
}

let db: Db = makeDb(getPrototypeMode());
const listeners = new Set<(e: AdapterEvent) => void>();
const emit = (e: AdapterEvent) => listeners.forEach((l) => l(e));

// The dev control swaps the whole scenario.
subscribePrototypeMode(() => {
  db = makeDb(getPrototypeMode());
  emit("reset");
});

/**
 * DEV FIXTURE section text. Neutral placeholders only - no real policy. The
 * real content is authored by Beeliv HR/Ops and served by the backend.
 */
function withDevSections(a: SOPAssignment): SOPAssignment {
  const sections = DEV_SECTION_TITLES.map((title, i) => ({
    id: `${a.sop.id}-s${i + 1}`,
    title,
    body: `Beeliv will publish the full content for "${title}" in "${a.sop.title}" here.`,
  }));
  const completedSections = a.status === "completed" ? sections.map((_, i) => i) : Array.from({ length: Math.round((a.progress / 100) * sections.length) }, (_, i) => i);
  return {
    ...a,
    sop: { ...a.sop, sections },
    completedSections,
    currentSection: a.status === "completed" ? sections.length - 1 : completedSections.length,
    completedAt: a.status === "completed" ? at(addDays(todayISO(), -25), "10:00") : null,
  };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** Scenario gate for data reads: "loading" never resolves, "error" rejects. */
async function gate(): Promise<void> {
  if (db.mode === "loading") return new Promise<void>(() => undefined);
  await sleep(350);
  if (db.mode === "error") throw new Error("DEV FIXTURE: simulated request failure");
}
async function chrome(): Promise<void> {
  await sleep(120);
}
/** Completed SOP state: every section read, 100%, timestamped. */
const finishedSOP = (s: SOPAssignment) => {
  const total = s.sop.sections?.length ?? 1;
  return { status: "completed" as const, progress: 100, completedSections: Array.from({ length: total }, (_, i) => i), currentSection: total - 1, completedAt: new Date().toISOString() };
};
const clone = <T,>(v: T): T => structuredClone(v);

/** Records (or refreshes) the read receipt for one SOP version: first open sets readAt, later opens only move lastOpenedAt. */
function recordReceipt(a: SOPAssignment) {
  const now = new Date().toISOString();
  const found = db.sopReceipts.find((r) => r.sopId === a.sop.id && r.version === a.sop.version);
  db.sopReceipts = found
    ? db.sopReceipts.map((r) => (r === found ? { ...r, lastOpenedAt: now } : r))
    : [...db.sopReceipts, { sopId: a.sop.id, version: a.sop.version, readAt: now, lastOpenedAt: now }];
}

function requiredActions(): RequiredAction[] {
  const out: RequiredAction[] = [];
  for (const d of db.documents) {
    if (d.status === "required" || d.status === "update-required")
      out.push({ id: `ra-${d.id}`, kind: d.requestNote ? "document-request" : "document", title: d.requestNote ? `Upload: ${d.name}` : `Upload ${d.name}`, detail: d.requestNote ?? "Required document", dueDate: d.dueDate, href: "/staff/documents", actionLabel: "Upload" });
  }
  for (const s of db.sops) if (s.required && s.status !== "completed" && !s.acknowledged && s.progress === 0)
    out.push({ id: `ra-${s.id}`, kind: "sop", title: `Review updated SOP: ${s.sop.title}`, detail: `${s.sop.category} - ${s.sop.version}`, dueDate: s.dueDate, href: "/staff/sops-training", actionLabel: "Review" });
  for (const t of db.training) if (t.required && t.status === "in-progress")
    out.push({ id: `ra-${t.id}`, kind: "training", title: `Continue training: ${t.training.title}`, detail: `${t.progress}% complete`, dueDate: t.dueDate, href: "/staff/sops-training", actionLabel: "Continue" });
  return out;
}

function onboardingItems(): OnboardingItem[] | null {
  if (db.profile.accountStatus !== "onboarding") return null;
  const accepted = new Set(db.acceptances.map((a) => a.agreementId));
  return [
    ...db.agreements.map((a) => ({ id: `ob-${a.id}`, kind: "agreement" as const, label: a.title, done: accepted.has(a.id), agreement: a, href: null, detail: a.id === "agr-privacy" ? "How Beeliv looks after your personal information." : "Read it, then accept to confirm.", dueDate: null })),
    // One item per profile section; each ticks when that section holds data (a pending change still counts as given).
    { id: "ob-personal", kind: "profile" as const, label: "Add your personal details", done: personalComplete(db.personal), agreement: null, href: "/staff/profile#personal", detail: "Your birthday, address and where you are from.", dueDate: addDays(todayISO(), 4) },
    { id: "ob-kin", kind: "profile" as const, label: "Add your next of kin", done: db.sensitive.nextOfKin.state !== "empty", agreement: null, href: "/staff/profile#next-of-kin", detail: "Someone Beeliv can reach in an emergency.", dueDate: addDays(todayISO(), 4) },
    { id: "ob-nin", kind: "profile" as const, label: "Add your NIN", done: db.sensitive.nin.state !== "empty", agreement: null, href: "/staff/profile#identity", detail: "Your 11-digit National Identification Number.", dueDate: null },
    { id: "ob-bank", kind: "profile" as const, label: "Add your bank details", done: db.sensitive.bank.state !== "empty", agreement: null, href: "/staff/profile#banking", detail: "Account name, account number and bank.", dueDate: null },
    { id: "ob-photo", kind: "document" as const, label: "Upload a passport photograph", done: db.documents.some((d) => d.id === "doc-photo" && !!d.fileName), agreement: null, href: "/staff/documents", detail: "A clear, recent photo of you.", dueDate: addDays(todayISO(), 2) },
  ];
}

function homeSnapshot(): StaffHome {
  const today = todayISO();
  const active = db.mode !== "onboarding";
  return {
    profile: db.profile,
    assignment: db.assignments[0] ?? null,
    today: db.today,
    todaysShifts: db.shifts.filter((s) => s.date === today),
    requiredActions: requiredActions(),
    upcoming: db.shifts.filter((s) => s.date >= today),
    recentAttendance: [
      ...db.attendance,
      ...(db.today.state === "checked-in" || db.today.state === "checked-out"
        ? [{ id: "att-today", date: today, shiftId: db.today.shift?.id ?? null, checkedInAt: db.today.checkedInAt, checkedOutAt: db.today.checkedOutAt, status: "recorded" as const }]
        : []),
    ],
    leave: db.leave,
    leaveSummary: active && db.mode !== "no-assignment" ? { remaining: 12, used: 3, unit: "days" } : null,
    learning: [
      ...db.sops.filter((s) => s.status !== "completed").map((s) => ({ id: s.id, kind: "sop" as const, title: s.sop.title, progress: s.progress, dueDate: s.dueDate, status: s.status, href: "/staff/sops-training" })),
      ...db.training.filter((t) => t.status !== "completed").map((t) => ({ id: t.id, kind: "training" as const, title: t.training.title, progress: t.progress, dueDate: t.dueDate, status: t.status, href: "/staff/sops-training" })),
    ],
    learningSummary: active ? { completed: 4, total: 6 } : null,
    announcements: db.announcements,
    onboarding: onboardingItems(),
  };
}

/* Sensitive entry (DEV FIXTURE). Stands in for the backend: it keeps ONLY a masked form of what is typed and drops the full value at once. */
const maskTail = (digits: string, keep = 3) => `${"•".repeat(Math.max(0, digits.length - keep))} ${digits.slice(-keep)}`.trim();
const maskName = (name: string) => name.trim().split(/\s+/).filter(Boolean).map((w) => `${w[0].toUpperCase()}•••`).join(" ");
/** First save is recorded; any later save is a change that waits for HR review (assumed rule, see docs/contracts/staff-personal-details.md). */
const nextState = (s: SensitiveState): SensitiveState => (s === "empty" ? "saved" : "change-pending");

export const mockStaffAdapter: StaffAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async getStaffHome() { await gate(); return clone(homeSnapshot()); },
  async getEntitlements(): Promise<Entitlements> {
    await chrome();
    return { applicant: true, staff: db.mode !== "no-entitlement" };
  },
  async getStaffProfile() { await chrome(); return clone(db.profile); },
  async getNavCounts(): Promise<NavCounts> {
    await chrome();
    if (db.mode === "onboarding") return {};
    return { "/staff/sops-training": db.sops.filter((s) => s.status !== "completed").length, "/staff/documents": db.documents.filter((d) => d.status === "required" || d.status === "update-required").length };
  },
  async getCurrentAssignment() { await chrome(); return clone(db.assignments.find((a) => a.status === "active" || a.status === "upcoming") ?? null); },
  async getAssignmentHistory() { await gate(); return clone(db.assignments); },
  async getSchedule(range) { await gate(); return clone(db.shifts.filter((s) => s.date >= range.from && s.date <= range.to)); },
  async getTodayAttendance() { await gate(); return clone(db.today); },
  async getAttendanceHistory() {
    await gate();
    const t = db.today;
    const todayRec: AttendanceRecord[] = t.state === "checked-in" || t.state === "checked-out" ? [{ id: "att-today", date: todayISO(), shiftId: t.shift?.id ?? null, checkedInAt: t.checkedInAt, checkedOutAt: t.checkedOutAt, status: "recorded" }] : [];
    return clone([...todayRec, ...db.attendance]);
  },
  async getLeaveRequests() { await gate(); return clone(db.leave); },
  async getStaffDocuments() { await gate(); return clone(db.documents); },
  async getSOPs() { await gate(); return clone(db.sops); },
  async getSopLibrary(): Promise<SopItem[]> { await gate(); return clone(buildSopItems(db.sops, db.sopReceipts)); },
  async openSop(id) {
    await sleep(120);
    const a = db.sops.find((s) => s.id === id);
    if (!a) throw new Error("DEV FIXTURE: SOP not assigned to this person");
    recordReceipt(a);
    // A SOP that needs no sign-off is finished once it has been read.
    if (!a.sop.requiresAcknowledgement && a.status !== "completed") db.sops = db.sops.map((s) => (s.id === id ? { ...s, ...finishedSOP(s) } : s));
    emit("change");
    return clone(buildSopItems(db.sops, db.sopReceipts).find((s) => s.id === id) as SopItem);
  },
  async getTraining() { await gate(); return clone(db.training); },
  async getStaffRecords() { await gate(); return clone(db.records); },
  async getAnnouncements() { await gate(); return clone(db.announcements); },
  async getNotifications() { await chrome(); return clone(db.notifications); },
  async getPersonalDetails() { await chrome(); return clone(db.personal); },
  async getEmployment() { await chrome(); return clone(db.employment); },
  async getSensitiveStatus() { await chrome(); return clone(db.sensitive); },

  async checkIn() {
    await sleep(500);
    db.today = { ...db.today, state: "checked-in", checkedInAt: new Date().toISOString() };
    emit("change");
    return clone(db.today);
  },
  async checkOut() {
    await sleep(500);
    db.today = { ...db.today, state: "checked-out", checkedOutAt: new Date().toISOString() };
    emit("change");
    return clone(db.today);
  },
  async requestLeave(input: LeaveRequestInput) {
    await sleep(500);
    const req: LeaveRequest = { id: `lv-dev-${db.leave.length + 1}`, type: input.type, startDate: input.startDate, endDate: input.endDate, reason: input.reason || null, status: "pending", submittedAt: new Date().toISOString(), decisionNote: null, attachmentName: input.attachment?.name ?? null, canCancel: true };
    db.leave = [req, ...db.leave];
    emit("change");
    return clone(req);
  },
  async cancelLeaveRequest(id) {
    await sleep(400);
    db.leave = db.leave.map((l) => (l.id === id ? { ...l, status: "cancelled" as const, canCancel: false } : l));
    emit("change");
    return clone(db.leave.find((l) => l.id === id) as LeaveRequest);
  },
  async uploadStaffDocument(documentId, file) {
    await sleep(600);
    db.documents = db.documents.map((d) => (d.id === documentId ? { ...d, status: "under-review" as const, fileName: file.name, updatedAt: new Date().toISOString() } : d));
    emit("change");
    return clone(db.documents.find((d) => d.id === documentId) as StaffDocument);
  },
  async replaceStaffDocument(documentId, file) {
    return mockStaffAdapter.uploadStaffDocument(documentId, file);
  },
  async acknowledgeAgreement(agreementId) {
    await sleep(500);
    const a = db.agreements.find((x) => x.id === agreementId);
    const acc: AgreementAcceptance = { agreementId, version: a?.version ?? "1.0", acceptedAt: new Date().toISOString() };
    db.acceptances = [...db.acceptances.filter((x) => x.agreementId !== agreementId), acc];
    emit("change");
    return clone(acc);
  },
  async startTraining(id) {
    await sleep(400);
    db.training = db.training.map((t) => (t.id === id && t.status === "assigned" ? { ...t, status: "in-progress" as const, progress: Math.max(t.progress, 1) } : t));
    emit("change");
    return clone(db.training.find((t) => t.id === id) as TrainingAssignment);
  },
  async acknowledgeSOP(id) {
    await sleep(400);
    db.sops = db.sops.map((s) => (s.id === id ? { ...s, ...finishedSOP(s), acknowledged: true } : s));
    const done = db.sops.find((s) => s.id === id);
    if (done && !db.sopReceipts.some((r) => r.sopId === done.sop.id && r.version === done.sop.version)) recordReceipt(done);
    emit("change");
    return clone(db.sops.find((s) => s.id === id) as SOPAssignment);
  },
  async saveSOPProgress(id, sectionIndex) {
    await sleep(120);
    db.sops = db.sops.map((s) => {
      if (s.id !== id || s.status === "completed") return s; // re-reading a completed SOP changes nothing
      const total = s.sop.sections?.length ?? 1;
      const index = Math.max(0, Math.min(total - 1, sectionIndex));
      // Moving on marks every earlier section as read; progress is derived from that.
      const done = new Set([...(s.completedSections ?? []), ...Array.from({ length: index }, (_, i) => i)]);
      return { ...s, currentSection: index, completedSections: [...done].sort((x, y) => x - y), progress: Math.round((done.size / total) * 100), status: "in-progress" as const };
    });
    emit("change");
    return clone(db.sops.find((s) => s.id === id) as SOPAssignment);
  },
  async completeSOP(id) {
    await sleep(400);
    db.sops = db.sops.map((s) => (s.id === id ? { ...s, ...finishedSOP(s) } : s));
    emit("change");
    return clone(db.sops.find((s) => s.id === id) as SOPAssignment);
  },
  async completeTraining(id) {
    await sleep(400);
    db.training = db.training.map((t) => (t.id === id ? { ...t, status: "completed" as const, progress: 100 } : t));
    emit("change");
    return clone(db.training.find((t) => t.id === id) as TrainingAssignment);
  },
  async markNotificationRead(id) {
    await sleep(150);
    db.notifications = db.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    emit("change");
    return clone(db.notifications.find((n) => n.id === id) as Notification);
  },
  async deleteNotification(id) {
    await sleep(150);
    db.notifications = db.notifications.filter((n) => n.id !== id);
    emit("change");
  },
  async acknowledgeStaffRecord(id) {
    await sleep(400);
    db.records = db.records.map((r) => (r.id === id ? { ...r, status: "acknowledged" as const } : r));
    emit("change");
    return clone(db.records.find((r) => r.id === id) as StaffRecord);
  },
  async updateStaffContact(patch) {
    await sleep(400);
    db.profile = { ...db.profile, preferredName: patch.preferredName, phone: patch.phone };
    emit("change");
    return clone(db.profile);
  },
  async savePersonalDetails(input: StaffPersonalDetails) {
    await sleep(400);
    db.personal = { ...input };
    emit("change");
    return clone(db.personal);
  },
  async saveEmployer(which, input: StaffEmployer) {
    await sleep(400);
    db.employment = { ...db.employment, [which]: { ...input } };
    emit("change");
    return clone(db.employment);
  },
  async saveNextOfKin(input: NextOfKinInput) {
    await sleep(500);
    if (!input.name.trim() || !input.phone.trim()) throw new Error("invalid");
    const prev = db.sensitive.nextOfKin;
    // Until HR applies a change, the earlier masked values stay on show.
    db.sensitive = {
      ...db.sensitive,
      nextOfKin: prev.state === "empty" ? { state: "saved", maskedName: maskName(input.name), maskedPhone: maskTail(input.phone.replace(/\D/g, "")), updatedAt: new Date().toISOString() } : { ...prev, state: nextState(prev.state), updatedAt: new Date().toISOString() },
    };
    emit("change");
    return clone(db.sensitive);
  },
  async saveNin(input: NinInput) {
    await sleep(500);
    if (!isValidNin(input.nin)) throw new Error("invalid");
    const prev = db.sensitive.nin;
    db.sensitive = { ...db.sensitive, nin: prev.state === "empty" ? { state: "saved", masked: maskTail(input.nin), updatedAt: new Date().toISOString() } : { ...prev, state: nextState(prev.state), updatedAt: new Date().toISOString() } };
    emit("change");
    return clone(db.sensitive);
  },
  async saveBankDetails(input: BankDetailsInput) {
    await sleep(500);
    if (!input.accountName.trim() || !input.bankName.trim() || !isValidNuban(input.accountNumber)) throw new Error("invalid");
    const prev = db.sensitive.bank;
    db.sensitive = { ...db.sensitive, bank: prev.state === "empty" ? { state: "saved", maskedAccount: maskTail(input.accountNumber, 4), updatedAt: new Date().toISOString() } : { ...prev, state: nextState(prev.state), updatedAt: new Date().toISOString() } };
    emit("change");
    return clone(db.sensitive);
  },
  async saveAccessibility(input: AccessibilityInput) {
    await sleep(400);
    // The answer and detail are not kept in the fixture at all; only that the person answered.
    void input;
    const prev = db.sensitive.accessibility;
    db.sensitive = { ...db.sensitive, accessibility: { state: nextState(prev.state), updatedAt: new Date().toISOString() } };
    emit("change");
    return clone(db.sensitive);
  },
};
