/**
 * DEV FIXTURE ADAPTER (MockClientAnalyticsAdapter) - not real data.
 * Implements the ClientAnalyticsAdapter contract over the single deterministic
 * fixture in ./mock-data.ts. Aggregates (summary, trend, distribution,
 * coverage, compliance...) are COMPUTED here from the fixture's records, the
 * way the backend's authorised aggregate queries will compute them from the
 * real tables - so every screen reconciles.
 *
 * It stands in for the BACKEND, so it (not the UI) applies the outlet scope
 * and the dev "Prototype state" (lib/client/dev-controls.ts).
 */
import { RestrictedError, type AdapterEvent, type ClientAnalyticsAdapter } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { addDays, dayMonth, displayName, plural, startOfWeek, todayISO } from "../format";
import { complianceHref, recruitmentHref, requestHref, attendanceHref } from "../links";
import type {
  AssignmentHistoryEntry,
  AttendancePeriodSummary,
  ScheduleShiftEntry,
  ScheduleView,
  StaffScheduleEntry,
  WorkforceMemberDetail,
  ActivityItem,
  AttendanceRecord,
  AttendanceSummary,
  AttentionItem,
  CandidateDetail,
  CandidateReview,
  ClientNotification,
  ClientOnboarding,
  ClientOverview,
  ClientSession,
  OnboardingItem,
  OnboardingItemId,
  OnboardingSave,
  ComplianceItem,
  ComplianceSummary,
  DateRange,
  DepartmentCount,
  ISODate,
  OutletScope,
  PositionState,
  RecruitmentPosition,
  RecruitmentSummary,
  ScheduleDay,
  ShiftCoverage,
  WorkforceMember,
  WorkforceRequest,
} from "../types";
import { DEPARTMENT_LABEL, DEPARTMENT_ORDER, SHIFTS, SHIFT_ORDER } from "../labels";
import { CLIENT_NAME, ONBOARDING_AGREEMENTS, ONBOARDING_DETAILS, ONBOARDING_NOTIFICATIONS, OUTLETS, TEAM, USER, getFixture } from "./mock-data";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Scenario gate for data reads: "loading" never resolves, "error" rejects. */
async function gate(): Promise<void> {
  const mode = getPrototypeMode();
  if (mode === "loading") return new Promise<void>(() => undefined);
  await sleep(220);
  if (mode === "error") throw new Error("DEV FIXTURE: simulated request failure");
}

const inScope = (scope: OutletScope, outletId: string) => scope === "all" || scope === outletId;

/* ---------- scoped, mode-aware views of the fixture ---------- */

function members(scope: OutletScope): WorkforceMember[] {
  if (getPrototypeMode() === "no-workforce") return [];
  return getFixture().members.filter((m) => inScope(scope, m.outletId));
}

function recordsFor(scope: OutletScope, from: ISODate, to: ISODate): AttendanceRecord[] {
  const mode = getPrototypeMode();
  if (mode === "no-workforce" || mode === "no-attendance") return [];
  return getFixture().records.filter((r) => inScope(scope, r.outletId) && r.date >= from && r.date <= to);
}

function requests(scope: OutletScope): WorkforceRequest[] {
  const mode = getPrototypeMode();
  if (mode === "no-recruitment") return [];
  return getFixture().requests.filter((r) => inScope(scope, r.outletId));
}

function candidates(scope: OutletScope): CandidateReview[] {
  const mode = getPrototypeMode();
  if (mode === "no-recruitment" || mode === "no-candidates") return [];
  return getFixture().candidates.filter((c) => inScope(scope, c.outletId));
}

function documents(scope: OutletScope): ComplianceItem[] {
  const mode = getPrototypeMode();
  if (mode === "no-workforce") return [];
  const items = getFixture().compliance.filter((c) => inScope(scope, c.outletId));
  return mode === "no-compliance-issues" ? items.map((c) => ({ ...c, state: "complete" as const, expiresOn: null })) : items;
}

function summarise(date: ISODate, recs: AttendanceRecord[]): AttendanceSummary {
  const count = (s: AttendanceRecord["status"]) => recs.filter((r) => r.status === s).length;
  const present = count("present");
  const scheduled = recs.length;
  return {
    date,
    scheduled,
    present,
    late: count("late"),
    absent: count("absent"),
    onLeave: count("on-leave"),
    attendanceRate: scheduled ? Math.round((present / scheduled) * 1000) / 10 : 0,
  };
}

function attendanceSummary(scope: OutletScope, date: ISODate): AttendanceSummary {
  return summarise(date, recordsFor(scope, date, date));
}

function openPositions(scope: OutletScope): number {
  return requests(scope)
    .filter((r) => r.status !== "closed")
    .reduce((n, r) => n + r.count, 0);
}

function recruitment(scope: OutletScope): RecruitmentSummary {
  const fx = getFixture();
  const cands = candidates(scope);
  const positions: RecruitmentPosition[] = requests(scope)
    // Only requests Beeliv is actively working on show as recruitment; "submitted" is still a request.
    .filter((r) => r.status === "in-recruitment" || r.status === "candidates-submitted")
    .map((r) => {
      const ready = cands.filter((c) => c.outletId === r.outletId && c.position === r.role && c.feedback === null).length;
      const screening = fx.screening[r.id] ?? 0;
      const state: PositionState = ready > 0 ? "candidates-ready" : screening > 0 ? "screening" : "in-progress";
      return {
        id: `pos-${r.id}`,
        title: r.count > 1 ? `${r.role}s` : r.role,
        outletId: r.outletId,
        outletName: OUTLETS.find((o) => o.id === r.outletId)?.name ?? "",
        state,
        candidatesReady: ready,
        candidatesScreening: getPrototypeMode() === "no-recruitment" ? 0 : screening,
        openings: r.count,
        requestId: r.id,
      };
    });
  return { awaitingFeedback: cands.filter((c) => c.feedback === null).length, openPositions: openPositions(scope), positions };
}

function compliance(scope: OutletScope): ComplianceSummary {
  const items = documents(scope);
  const n = (s: ComplianceItem["state"]) => items.filter((i) => i.state === s).length;
  const complete = n("complete");
  return {
    total: items.length,
    complete,
    outstanding: n("outstanding"),
    updateRequired: n("update-required"),
    expiringSoon: n("expiring"),
    // Rounded DOWN: a compliance figure must never overstate (44/48 = 91.7% shows 91%).
    percentComplete: items.length ? Math.floor((complete / items.length) * 100) : 0,
    attention: items.filter((i) => i.state !== "complete"),
  };
}

function scopeName(scope: OutletScope): string {
  return scope === "all" ? `All ${CLIENT_NAME} outlets` : (OUTLETS.find((o) => o.id === scope)?.name ?? "");
}

function assertAuthorised(scope: OutletScope) {
  // The real backend re-checks membership / RLS here; the fixture just validates the id.
  if (scope !== "all" && !OUTLETS.some((o) => o.id === scope)) throw new RestrictedError("Outlet not in your scope");
}

function attention(scope: OutletScope, today: ISODate): AttentionItem[] {
  const items: AttentionItem[] = [];
  const rec = recruitment(scope);
  if (rec.awaitingFeedback > 0) {
    const titles = [...new Set(rec.positions.filter((p) => p.candidatesReady > 0).map((p) => p.title))];
    items.push({ id: "att-candidates", kind: "candidates", count: rec.awaitingFeedback, title: `${plural(rec.awaitingFeedback, "candidate")} awaiting your feedback`, detail: titles.join(", "), href: recruitmentHref({ status: "awaiting-feedback" }) });
  }
  const comp = compliance(scope);
  if (comp.attention.length > 0) {
    const parts = [
      comp.outstanding ? `${comp.outstanding} outstanding` : "",
      comp.updateRequired ? `${comp.updateRequired} update required` : "",
      comp.expiringSoon ? `${comp.expiringSoon} expiring soon` : "",
    ].filter(Boolean);
    items.push({ id: "att-documents", kind: "documents", count: comp.attention.length, title: `${plural(comp.attention.length, "staff document")} ${comp.attention.length === 1 ? "needs" : "need"} attention`, detail: parts.join(" · "), href: complianceHref({ status: "attention" }) });
  }
  const updated = requests(scope).filter((r) => r.hasUpdate);
  if (updated.length > 0) {
    const first = updated[0];
    items.push({
      id: "att-request",
      kind: "request",
      count: updated.length,
      title: `${plural(updated.length, "workforce request")} updated`,
      detail: `${first.role} · ${OUTLETS.find((o) => o.id === first.outletId)?.name ?? ""}`,
      href: updated.length === 1 ? requestHref(first.id) : requestHref(),
    });
  }
  const absent = attendanceSummary(scope, today).absent;
  if (absent > 0) {
    items.push({ id: "att-absence", kind: "absence", count: absent, title: `${absent} staff ${absent === 1 ? "member" : "members"} absent today`, detail: "See who is absent", href: attendanceHref({ status: "absent", date: "today" }) });
  }
  return items;
}

const atLocal = (date: ISODate, time: string) => new Date(`${date}T${time}:00`).toISOString();

/* ---------- the adapter ---------- */

const listeners = new Set<(e: AdapterEvent) => void>();
/** Fixture-only: ids the user has marked read this session. */
const readNotificationIds = new Set<string>();
const deletedNotificationIds = new Set<string>();
subscribePrototypeMode(() => listeners.forEach((l) => l("reset")));

/* ---------- new-client onboarding (dev fixture state, in memory) ---------- */

type OnboardingMemory = Pick<ClientOnboarding, "currentStep" | "details" | "notifications" | "agreements"> & { done: Set<OnboardingItemId> };
const freshOnboarding = (): OnboardingMemory => ({
  currentStep: 0,
  done: new Set<OnboardingItemId>(["invitation"]),
  details: { ...ONBOARDING_DETAILS },
  notifications: { ...ONBOARDING_NOTIFICATIONS },
  agreements: ONBOARDING_AGREEMENTS.map((a) => ({ ...a, acknowledged: false })),
});
let onboarding = freshOnboarding();
/** DEV FIXTURE: an already-onboarded account (every mode except "new-client") so Settings can save and read back. */
const settledAccount = (): OnboardingMemory => ({
  ...freshOnboarding(),
  currentStep: 5,
  details: { ...ONBOARDING_DETAILS, fullName: "Tunde Adeyemi", jobTitle: "General Manager", phone: "+234 803 555 0142" },
  agreements: ONBOARDING_AGREEMENTS.map((a) => ({ ...a, acknowledged: true, acknowledgedAt: "2026-09-02T09:00:00.000Z" })),
});
const account = settledAccount();
// Entering the "New client" state starts setup from scratch; other states never onboard.
subscribePrototypeMode(() => {
  if (getPrototypeMode() === "new-client") onboarding = freshOnboarding();
});

/** DEV FIXTURE / TBD wording: the backend owns these items and their done flags. */
const ITEM_DEFS: { id: OnboardingItemId; label: string; detail: string; step: number | null }[] = [
  { id: "invitation", label: "Accept your invitation", detail: "Done when you accepted your invitation.", step: null },
  { id: "details", label: "Confirm your details", detail: "Your name, job title and phone number.", step: 1 },
  { id: "access", label: "Review your outlets and access", detail: "What you can see, and what Beeliv keeps restricted.", step: 2 },
  { id: "notifications", label: "Choose your notifications", detail: "Pick what you want to hear about.", step: 3 },
  { id: "agreements", label: "Acknowledge the agreements", detail: "Client terms and the data-use acknowledgement.", step: 4 },
];

function onboardingView(): ClientOnboarding {
  const onboarding_ = getPrototypeMode() === "new-client" ? onboarding : null;
  const done = (id: OnboardingItemId) => (onboarding_ ? onboarding_.done.has(id) : true);
  const items: OnboardingItem[] = ITEM_DEFS.map((d) => ({ ...d, done: done(d.id) }));
  const finished = items.every((i) => i.done);
  const src = onboarding_ ?? account;
  return {
    status: finished ? "complete" : items.some((i) => i.done && i.id !== "invitation") || src.currentStep > 0 ? "in-progress" : "not-started",
    currentStep: src.currentStep,
    invitedBy: TEAM,
    items,
    details: { ...src.details },
    notifications: { ...src.notifications },
    agreements: src.agreements.map((a) => ({ ...a })),
  };
}

export const mockClientAdapter: ClientAnalyticsAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async getSession(): Promise<ClientSession> {
    await sleep(120);
    const mode = getPrototypeMode();
    const gates = ["invitation-required", "invitation-expired", "invitation-invalid", "invitation-used", "suspended", "no-client-access", "wrong-portal", "no-outlets"] as const;
    const state = (gates as readonly string[]).includes(mode) ? (mode as (typeof gates)[number]) : "active";
    return {
      accountState: state,
      user: { ...USER, avatarUrl: (mode === "new-client" ? onboarding : account).details.avatarUrl ?? USER.avatarUrl },
      clientName: CLIENT_NAME,
      outlets: state === "active" ? OUTLETS : [],
      // The user's own outlet, per the brief's example numbers (48 active at Kalina Abuja).
      defaultScope: "kalina-abuja",
      team: TEAM,
      // DEV FIXTURE: read-only account facts (managed by Beeliv).
      clientId: "BLV-CLI-000014",
      accessLevel: "Client Owner",
      primaryOutletId: "kalina-abuja",
    };
  },

  async getOverview(scope): Promise<ClientOverview> {
    await gate();
    assertAuthorised(scope);
    const today = todayISO();
    const summary = attendanceSummary(scope, today);
    return {
      scope,
      scopeLabel: scopeName(scope),
      greetingName: displayName(USER),
      outlet: scope === "all" ? null : (OUTLETS.find((o) => o.id === scope) ?? null),
      metrics: { ...summary, activeStaff: members(scope).length, openPositions: openPositions(scope) },
      checkedIn: recordsFor(scope, today, today).filter((r) => r.clockIn !== null).length,
      attention: attention(scope, today),
      team: TEAM,
    };
  },

  async getAttendanceSummary(scope, date) {
    await gate();
    assertAuthorised(scope);
    return attendanceSummary(scope, date);
  },

  async getAttendanceTrend(scope, range: DateRange) {
    await gate();
    assertAuthorised(scope);
    if (getPrototypeMode() === "no-report-data") return [];
    const out: AttendanceSummary[] = [];
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
      const s = attendanceSummary(scope, d);
      // Days with no records (outside the history window) are left out rather than drawn as zero.
      if (s.scheduled > 0) out.push(s);
    }
    return out;
  },

  async getWorkforceDistribution(scope): Promise<DepartmentCount[]> {
    await gate();
    assertAuthorised(scope);
    const list = members(scope);
    return DEPARTMENT_ORDER.map((d) => ({ departmentId: d, label: DEPARTMENT_LABEL[d], count: list.filter((m) => m.departmentId === d).length }));
  },

  async getScheduleCoverage(scope): Promise<ShiftCoverage[]> {
    await gate();
    assertAuthorised(scope);
    if (getPrototypeMode() === "no-schedule") return [];
    const list = members(scope);
    if (list.length === 0) return [];
    const req = getFixture().requiredByOutlet;
    return SHIFT_ORDER.map((s) => ({
      shift: s,
      label: SHIFTS[s].label,
      start: SHIFTS[s].start,
      end: SHIFTS[s].end,
      assigned: list.filter((m) => m.shift === s).length,
      required: OUTLETS.filter((o) => inScope(scope, o.id)).reduce((n, o) => n + req[o.id][s], 0),
    }));
  },

  async getWeekSchedule(scope, weekOf): Promise<ScheduleDay[]> {
    await gate();
    assertAuthorised(scope);
    if (getPrototypeMode() === "no-schedule") return [];
    const list = members(scope);
    if (list.length === 0) return [];
    const start = startOfWeek(weekOf);
    // Fixture limitation: rotations are fixed, so every day carries the same assignments.
    return Array.from({ length: 7 }, (_, i) => ({
      date: addDays(start, i),
      total: list.length,
      shifts: { morning: list.filter((m) => m.shift === "morning").length, evening: list.filter((m) => m.shift === "evening").length, night: list.filter((m) => m.shift === "night").length },
    }));
  },

  async getRecruitmentSummary(scope) {
    await gate();
    assertAuthorised(scope);
    return recruitment(scope);
  },

  async getComplianceSummary(scope) {
    await gate();
    assertAuthorised(scope);
    if (getPrototypeMode() === "restricted") throw new RestrictedError();
    return compliance(scope);
  },

  async getPayrollVisibility(scope) {
    await gate();
    assertAuthorised(scope);
    const mode = getPrototypeMode();
    if (mode === "restricted") throw new RestrictedError();
    if (mode === "no-payroll" || mode === "no-workforce") return { upcoming: [], history: [] };
    const list = getFixture().payroll.filter((p) => inScope(scope, p.outletId));
    return { upcoming: list.filter((p) => p.status === "upcoming"), history: list.filter((p) => p.status === "completed").sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1)) };
  },

  async getRecentActivity(scope): Promise<ActivityItem[]> {
    await gate();
    assertAuthorised(scope);
    const today = todayISO();
    const items: ActivityItem[] = [];
    const rec = recruitment(scope);
    for (const p of rec.positions.filter((x) => x.candidatesReady > 0)) {
      items.push({ id: `act-${p.id}`, kind: "candidates", title: `${plural(p.candidatesReady, "candidate")} submitted for ${p.title}`, detail: `${p.outletName} · Sent by Beeliv HR`, at: atLocal(addDays(today, -2), "14:20"), href: recruitmentHref({ status: "awaiting-feedback" }) });
    }
    for (const r of requests(scope).filter((x) => x.hasUpdate)) {
      items.push({ id: `act-${r.id}`, kind: "request", title: `${r.role} request updated`, detail: `${OUTLETS.find((o) => o.id === r.outletId)?.name ?? ""} · ${r.publicId}`, at: atLocal(addDays(today, -1), "10:05"), href: requestHref(r.id) });
    }
    for (const c of documents(scope).filter((x) => x.state === "expiring")) {
      items.push({ id: `act-${c.id}`, kind: "compliance", title: `${c.staffName}'s ${c.document} is expiring`, detail: `Expires ${c.expiresOn ? dayMonth(c.expiresOn) : "soon"}`, at: atLocal(addDays(today, -3), "09:30"), href: complianceHref({ status: "expiring" }) });
    }
    return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 5);
  },

  async getNotifications(scope): Promise<ClientNotification[]> {
    await gate();
    assertAuthorised(scope);
    const rec = recruitment(scope);
    const out: ClientNotification[] = [];
    const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();
    if (rec.awaitingFeedback > 0) out.push({ id: "n-cand", kind: "client.candidates_ready", title: "Candidates ready for review", message: `${plural(rec.awaitingFeedback, "candidate")} submitted by Beeliv awaiting your feedback.`, createdAt: ago(95), read: false, href: recruitmentHref({ status: "awaiting-feedback" }) });
    const upd = requests(scope).filter((r) => r.hasUpdate);
    if (upd.length > 0) out.push({ id: "n-req", kind: "client.request_updated", title: "Workforce request updated", message: `${upd[0].role} · ${OUTLETS.find((o) => o.id === upd[0].outletId)?.name ?? ""}`, createdAt: ago(60 * 20), read: false, href: requestHref(upd[0].id) });
    const comp = compliance(scope);
    if (comp.expiringSoon > 0) out.push({ id: "n-doc", kind: "client.compliance_expiring", title: "Document expiring soon", message: `${plural(comp.expiringSoon, "staff certificate")} expiring soon.`, createdAt: ago(60 * 52), read: true, href: complianceHref({ status: "expiring" }) });
    // Read state is per signed-in user (fixture: kept in memory for the session).
    return out.filter((n) => !deletedNotificationIds.has(n.id)).map((n) => (readNotificationIds.has(n.id) ? { ...n, read: true } : n));
  },

  async markNotificationRead(id) {
    readNotificationIds.add(id);
    listeners.forEach((l) => l("notifications"));
  },

  async deleteNotification(id) {
    deletedNotificationIds.add(id);
    listeners.forEach((l) => l("notifications"));
  },

  async markAllNotificationsRead() {
    for (const id of ["n-cand", "n-req", "n-doc"]) readNotificationIds.add(id);
    listeners.forEach((l) => l("notifications"));
  },

  async getWorkforce(scope) {
    await gate();
    assertAuthorised(scope);
    return members(scope);
  },

  async getWorkforceMemberDetail(scope, memberId): Promise<WorkforceMemberDetail | null> {
    await gate();
    assertAuthorised(scope);
    const member = members(scope).find((m) => m.id === memberId);
    if (!member) return null;
    const today = todayISO();
    const from = addDays(today, -29);
    const recs = recordsFor(scope, from, today).filter((r) => r.memberId === memberId);
    const s = summarise(today, recs);
    const attendance: AttendancePeriodSummary = { from, to: today, scheduled: s.scheduled, present: s.present, late: s.late, absent: s.absent, onLeave: s.onLeave, attendanceRate: s.attendanceRate };
    // Fixture limitation: rotations are fixed, so the next seven days repeat the member's shift.
    const upcomingSchedule: StaffScheduleEntry[] = getPrototypeMode() === "no-schedule" ? [] : Array.from({ length: 7 }, (_, i) => ({ date: addDays(today, i), shift: member.shift, start: SHIFTS[member.shift].start, end: SHIFTS[member.shift].end }));
    const outletName = OUTLETS.find((o) => o.id === member.outletId)?.name ?? "";
    // The fixture only knows the current assignment; earlier ones arrive if Beeliv approves sharing them (TBD).
    const history: AssignmentHistoryEntry[] = [{ id: `asg-${member.id}`, outletId: member.outletId, outletName, role: member.role, departmentId: member.departmentId, from: member.startDate, to: null }];
    return {
      member,
      outletName,
      clientName: CLIENT_NAME,
      attendance,
      recentAttendance: [...recs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 7),
      upcomingSchedule,
      documents: documents(scope).filter((d) => d.memberId === memberId),
      history,
    };
  },

  async getSchedule(scope, range): Promise<ScheduleView> {
    await gate();
    assertAuthorised(scope);
    // The Client's edit permission is a Beeliv decision that is still open: read-only until it says otherwise.
    const canEdit = false;
    if (getPrototypeMode() === "no-schedule") return { canEdit, shifts: [] };
    const list = members(scope);
    if (list.length === 0) return { canEdit, shifts: [] };
    const req = getFixture().requiredByOutlet;
    const shifts: ScheduleShiftEntry[] = [];
    // Fixture limitation: rotations are fixed, so every day carries the same assignments.
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
      for (const o of OUTLETS.filter((x) => inScope(scope, x.id))) {
        for (const sh of SHIFT_ORDER) {
          const staff = list.filter((m) => m.outletId === o.id && m.shift === sh).map((m) => ({ memberId: m.id, name: m.name, role: m.role, departmentId: m.departmentId, photoUrl: m.photoUrl }));
          shifts.push({ id: `shift-${o.id}-${d}-${sh}`, date: d, shift: sh, label: SHIFTS[sh].label, start: SHIFTS[sh].start, end: SHIFTS[sh].end, outletId: o.id, outletName: o.name, assigned: staff.length, required: req[o.id][sh], staff });
        }
      }
    }
    return { canEdit, shifts };
  },

  async getAttendanceRecords(scope, range) {
    await gate();
    assertAuthorised(scope);
    if (getPrototypeMode() === "no-report-data") return [];
    return recordsFor(scope, range.from, range.to).sort((a, b) => (a.date === b.date ? a.staffName.localeCompare(b.staffName) : a.date < b.date ? 1 : -1));
  },

  async getCandidates(scope) {
    await gate();
    assertAuthorised(scope);
    return candidates(scope);
  },

  async getWorkforceRequests(scope) {
    await gate();
    assertAuthorised(scope);
    return requests(scope);
  },

  async getDocuments(scope) {
    await gate();
    assertAuthorised(scope);
    // Same restriction as the compliance summary: both are the Documents & compliance domain.
    if (getPrototypeMode() === "restricted") throw new RestrictedError();
    return documents(scope);
  },

  async getCandidate(scope, id): Promise<CandidateDetail | null> {
    await gate();
    assertAuthorised(scope);
    const c = candidates(scope).find((x) => x.id === id);
    const extra = getFixture().candidateExtras[id];
    return c && extra ? { ...c, ...extra, skills: [...c.skills], documents: [...extra.documents], comments: [...extra.comments] } : null;
  },

  async submitCandidateFeedback(scope, id, input) {
    await gate();
    assertAuthorised(scope);
    const c = candidates(scope).find((x) => x.id === id);
    const extra = getFixture().candidateExtras[id];
    if (!c || !extra) throw new Error("Candidate not found");
    if (input.feedback) c.feedback = input.feedback;
    const text = input.comment?.trim();
    if (text) extra.comments = [...extra.comments, { id: `cmt-${id}-${extra.comments.length + 1}`, text, createdOn: todayISO() }];
    listeners.forEach((l) => l("notifications"));
  },

  async getWorkforceRequest(scope, id) {
    await gate();
    assertAuthorised(scope);
    return requests(scope).find((r) => r.id === id) ?? null;
  },

  async createWorkforceRequest(scope, input) {
    await gate();
    assertAuthorised(scope);
    if (!inScope(scope, input.outletId) || !OUTLETS.some((o) => o.id === input.outletId)) throw new RestrictedError("Outlet not in your scope");
    const list = getFixture().requests;
    const n = list.reduce((max, r) => Math.max(max, Number(r.id.replace("req-", ""))), 0) + 1;
    const today = todayISO();
    const created: WorkforceRequest = {
      id: `req-${n}`,
      publicId: `BLV-REQ-${String(n).padStart(4, "0")}`,
      outletId: input.outletId,
      role: input.role.trim(),
      departmentId: input.departmentId,
      count: input.count,
      resumptionDate: input.resumptionDate,
      reason: input.reason,
      notes: input.notes.trim(),
      status: "submitted",
      submittedOn: today,
      updatedOn: today,
      hasUpdate: false,
    };
    list.unshift(created);
    listeners.forEach((l) => l("notifications"));
    return created;
  },

  async getOnboarding(): Promise<ClientOnboarding> {
    await gate();
    return onboardingView();
  },

  async saveOnboarding(input: OnboardingSave): Promise<ClientOnboarding> {
    await sleep(160);
    const isNew = getPrototypeMode() === "new-client";
    const mem = isNew ? onboarding : account;
    if (isNew && input.currentStep !== undefined) mem.currentStep = Math.max(0, Math.min(5, input.currentStep));
    if (input.details) mem.details = { ...input.details };
    if (input.notifications) mem.notifications = { ...input.notifications };
    if (input.agreements) {
      const now = new Date().toISOString();
      mem.agreements = input.agreements.map((a) => {
        const was = mem.agreements.find((x) => x.id === a.id);
        return { ...a, acknowledgedAt: a.acknowledged ? (was?.acknowledgedAt ?? now) : null };
      });
    }
    if (isNew) for (const id of input.completed ?? []) mem.done.add(id);
    listeners.forEach((l) => l("notifications"));
    return onboardingView();
  },

  async getWorkforceRequestReasons() {
    await sleep(120);
    // DEV FIXTURE / TBD: Beeliv has not approved a reason taxonomy.
    return ["Expansion", "Replacement", "New opening", "Other"];
  },
};
