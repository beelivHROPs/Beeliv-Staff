/**
 * DEV FIXTURE for Workforce (Attendance, Leave, Scheduling, Warnings).
 * Everything is FICTIONAL ("Sample" people, ids match the Staff fixture).
 * The `BLV-...-PLACEHOLDER-n` references stand in for server-generated values.
 * Rules below (which action is allowed in which status, what a correction or a
 * publish does, who is late / absent) are PROVISIONAL mock behaviour so the UI
 * can be exercised; the spec does not define them and the backend owns them.
 * Writes are in-memory, append history, and reset with the Prototype state
 * control. Replace with a Supabase adapter implementing WorkforceAdapter.
 *
 * Preview helpers: `?state=restricted` shows the unauthorized state;
 * `?approve=off` makes Leave read-only (backend says canApprove = false).
 */
import { canDo } from "../role-access";
import { addDays, parseDate, startOfWeek, todayISO } from "@/lib/client/format";
import { RestrictedError, type AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { getAdminIdentity } from "../ops/identity";
import { clientIdInScope } from "../scope";
import { getDepartments, getLeaveTypes, getRoles, getWarningLevels, getWarningTypes } from "../lists/store";
import type { WorkforceAdapter } from "./adapter";
import type {
  AttendanceDetail,
  AttendanceFlag,
  AttendancePage,
  AttendanceQuery,
  AttendanceRow,
  AttendanceStatus,
  AttendanceTab,
  AckState,
  CorrectionInput,
  HistoryEntry,
  ISODate,
  LeavePage,
  LeaveQuery,
  LeaveRow,
  LeaveStatus,
  PersonRef,
  StaffLeaveHistory,
  TimeOffQuery,
  TimeOffResult,
  RosterStaff,
  SchedulePage,
  ScopeFacets,
  ShiftConflict,
  ShiftInput,
  ShiftRow,
  WarningDetail,
  WarningInput,
  WarningRow,
  WarningStatus,
  WarningsPage,
  WarningsQuery,
  WarningTab,
  WeekRoster,
} from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
subscribePrototypeMode(() => {
  reset();
  listeners.forEach((l) => l("reset"));
});

/** Loading / error modes, plus the restricted preview (`?state=restricted`). */
async function previewGate(ms = 300) {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("state") === "restricted") {
    await sleep(200);
    throw new RestrictedError();
  }
  await sleep(ms);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
  return mode;
}

const ME = "Funke Sample";

/**
 * HR level follows the prototype identity (lib/admin/ops/identity.ts). Provisional: an HR officer prepares
 * (creates and edits) but does not publish; HR Manager and Operations can publish. Needs Beeliv confirmation.
 * Prototype only: the real rule is enforced by the server grant and RLS.
 */
const mayPublish = () => getAdminIdentity() === "hr-manager" || getAdminIdentity() === "ops";

/* ---------- configuration served as data (defaults need Beeliv confirmation) ---------- */

// Leave types, warning types and levels, departments and roles come from Lists & Rules (/admin/lists).
const leaveTypeNames = (all = true) => getLeaveTypes(all).map((x) => x.name);
const warningTypeNames = (all = true) => getWarningTypes(all).map((x) => x.name);
const SHIFT_TIMES = [
  { label: "Morning", start: "07:00", end: "15:00" },
  { label: "Evening", start: "15:00", end: "23:00" },
];

const CLIENTS = [
  { id: "c-demo-hotel", name: "Demo Hotel Abuja" },
  { id: "c-demo-lounge", name: "Demo Lounge Lagos" },
];
const OUTLETS = [
  { id: "o-hotel-main", clientId: "c-demo-hotel", name: "Main building" },
  { id: "o-hotel-garki", clientId: "c-demo-hotel", name: "Garki annex" },
  { id: "o-lounge-vi", clientId: "c-demo-lounge", name: "Victoria Island" },
];
/**
 * PROTOTYPE scope (lib/admin/scope.ts): clients and outlets the signed-in identity may see. Detail reads, the
 * roster and shift writes use the same rule as the lists. The REAL enforcement is server-side (grant + RLS);
 * hiding things here is not access control.
 */
const scopedFacets = (): ScopeFacets => ({ clients: CLIENTS.filter((c) => clientIdInScope(c.id)), outlets: OUTLETS.filter((o) => clientIdInScope(o.clientId)) });
const outletInScope = (outletId: string) => OUTLETS.some((o) => o.id === outletId && clientIdInScope(o.clientId));
function assertOutletInScope(outletId: string) {
  if (!outletInScope(outletId)) throw new RestrictedError();
}
const outletOf = (id: string) => OUTLETS.find((o) => o.id === id)!;
const clientName = (outletId: string) => CLIENTS.find((c) => c.id === outletOf(outletId).clientId)!.name;

/** id, name, role, section, outlet. Ids match lib/admin/staff/mock.ts. */
const PEOPLE: [string, string, string, string, string][] = [
  ["s-001", "Folake Sample", "Commis Chef", "Kitchen", "o-lounge-vi"],
  ["s-002", "Tola Sample", "Floor Supervisor", "Management", "o-hotel-main"],
  ["s-003", "Adaeze Sample", "Waiter / Waitress", "Front of house", "o-hotel-main"],
  ["s-004", "Babatunde Sample", "Bar Attendant", "Bar", "o-lounge-vi"],
  ["s-005", "Chiamaka Sample", "Front Desk Officer", "Front of house", "o-hotel-main"],
  ["s-006", "Damilola Sample", "Commis Chef", "Kitchen", "o-hotel-garki"],
  ["s-007", "Efe Sample", "Waiter / Waitress", "Front of house", "o-hotel-garki"],
  ["s-008", "Funmi Sample", "Steward", "Support", "o-hotel-main"],
  ["s-009", "Goodness Sample", "Bar Attendant", "Bar", "o-lounge-vi"],
  ["s-010", "Hassan Sample", "Waiter / Waitress", "Front of house", "o-lounge-vi"],
  ["s-011", "Ireti Sample", "Front Desk Officer", "Front of house", "o-hotel-garki"],
  ["s-012", "Jide Sample", "Floor Supervisor", "Management", "o-lounge-vi"],
  ["s-013", "Kehinde Sample", "Commis Chef", "Kitchen", "o-hotel-main"],
  ["s-014", "Lola Sample", "Waiter / Waitress", "Front of house", "o-hotel-main"],
];
const person = (i: number): PersonRef => ({ id: PEOPLE[i][0], name: PEOPLE[i][1] });
const personById = (id: string) => PEOPLE.findIndex((p) => p[0] === id);

const at = (date: ISODate, time: string) => new Date(`${date}T${time}:00`).toISOString();
const minutesAfter = (date: ISODate, time: string, mins: number) => {
  const d = new Date(`${date}T${time}:00`);
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
};
const nowIso = () => new Date().toISOString();

let hid = 0;
function entry(action: string, actor: string, previous: string | null = null, next: string | null = null, note: string | null = null, when = nowIso()): HistoryEntry {
  return { id: `h-${++hid}`, action, actor, at: when, previous, next, note };
}

/* ---------- leave ---------- */

type LeaveSeed = [number, string, number, number, LeaveStatus, string | null, number | null];
/** person index, type, start offset, end offset, status, reason, submitted N days ago */
const LEAVE_SEEDS: LeaveSeed[] = [
  [5, "Annual leave", -2, 4, "approved", "Family event out of town.", 20],
  [2, "Annual leave", 20, 27, "pending", "Travelling for a wedding.", 3],
  [8, "Sick leave", 1, 2, "pending", "Doctor advised two days of rest.", 0],
  [0, "Personal leave", 9, 9, "pending", "Moving house.", 2],
  [6, "Annual leave", 14, 18, "pending", null, 6],
  [3, "Sick leave", -40, -38, "approved", "Malaria.", 41],
  [10, "Personal leave", -10, -10, "declined", "Personal errand.", 14],
  [11, "Annual leave", 5, 9, "approved", "Planned holiday.", 25],
  [13, "Other", 30, 31, "cancelled", "Cancelled by the staff member.", 10],
  [4, "Annual leave", 2, 3, "approved", "Short break.", 12],
  [1, "Sick leave", -1, -1, "approved", "Stomach upset.", 1],
  [7, "Annual leave", 40, 50, "pending", "Annual leave block.", 1],
  // Sample history (last ~3 months) and a few upcoming days, so "Who's off" and Staff leave history have something to show.
  [0, "Annual leave", -85, -81, "approved", "Family visit.", 100],
  [2, "Sick leave", -78, -77, "approved", "Flu.", 79],
  [4, "Annual leave", -70, -64, "approved", "Annual break.", 90],
  [6, "Personal leave", -62, -62, "approved", "Document appointment.", 70],
  [8, "Annual leave", -55, -51, "approved", "Travel.", 75],
  [1, "Sick leave", -49, -48, "approved", "Fever.", 50],
  [9, "Annual leave", -44, -38, "approved", "Wedding abroad.", 70],
  [11, "Annual leave", -60, -54, "approved", "Holiday.", 80],
  [12, "Personal leave", -33, -32, "approved", "Family matter.", 40],
  [7, "Annual leave", -30, -25, "approved", "Rest.", 45],
  [10, "Sick leave", -27, -26, "approved", "Cold.", 28],
  [13, "Annual leave", -24, -20, "approved", "Short trip.", 35],
  [5, "Sick leave", -19, -18, "approved", "Headache and fever.", 19],
  [3, "Annual leave", -17, -15, "approved", "Long weekend.", 30],
  [2, "Annual leave", -35, -30, "declined", "Peak season request.", 50],
  [9, "Personal leave", -45, -45, "cancelled", "Plans changed.", 50],
  [0, "Annual leave", 6, 8, "approved", "Short break.", 12],
  [12, "Sick leave", 12, 13, "approved", "Dental procedure.", 5],
  [13, "Annual leave", 21, 24, "approved", "Family trip.", 18],
];

let leave: LeaveRow[] = [];

function days(a: ISODate, b: ISODate) {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000) + 1;
}

function seedLeave() {
  const today = todayISO();
  leave = LEAVE_SEEDS.map(([pi, type, s, e, status, reason, ago], i) => {
    const start = addDays(today, s);
    const end = addDays(today, e);
    const o = outletOf(PEOPLE[pi][4]);
    const submitted = minutesAfter(addDays(today, -(ago ?? 1)), "09:00", i * 7);
    const decided = status === "pending" ? null : minutesAfter(addDays(today, -(ago ?? 1) + 1), "11:00", 0);
    const decidedBy = status === "approved" || status === "declined" ? ME : status === "cancelled" ? PEOPLE[pi][1] : null;
    return {
      id: `lv-${String(i + 1).padStart(3, "0")}`,
      staff: person(pi),
      clientId: o.clientId,
      client: clientName(o.id),
      outletId: o.id,
      outlet: o.name,
      type,
      startDate: start,
      endDate: end,
      days: days(start, end),
      balance: type === "Sick leave" ? null : { remaining: 14 - ((pi * 3) % 9), used: (pi * 3) % 9, unit: "days" },
      status,
      submittedAt: submitted,
      decidedBy,
      decidedAt: decided,
      reason,
      decisionNote: status === "declined" ? "Short notice during a busy weekend." : null,
      attachmentName: type === "Sick leave" && i % 2 === 0 ? "medical-note.pdf" : null,
      history: [
        entry("Submitted by staff", PEOPLE[pi][1], null, "Pending", reason, submitted),
        ...(status === "approved" ? [entry("Approved", ME, "Pending", "Approved", null, decided!)] : []),
        ...(status === "declined" ? [entry("Declined", ME, "Pending", "Declined", "Short notice during a busy weekend.", decided!)] : []),
        ...(status === "cancelled" ? [entry("Cancelled by staff", PEOPLE[pi][1], "Pending", "Cancelled", null, decided!)] : []),
      ],
    };
  });
}

const approvedLeaveOn = (staffId: string, date: ISODate) => leave.some((l) => l.staff.id === staffId && l.status === "approved" && l.startDate <= date && date <= l.endDate);

/* ---------- attendance ---------- */

type AttRec = AttendanceRow & { reference: string; note: string | null; pendingCorrection: AttendanceDetail["pendingCorrection"]; history: HistoryEntry[] };
let attendance: AttRec[] = [];

function seedAttendance() {
  const today = todayISO();
  attendance = [];
  let n = 0;
  for (let d = -13; d <= 0; d++) {
    const date = addDays(today, d);
    PEOPLE.forEach((p, pi) => {
      if ((parseDate(date).getDay() + pi) % 7 === 0) return; // day off
      const shift = SHIFT_TIMES[pi % 2];
      const o = outletOf(p[4]);
      const h = (pi * 7 + (d + 20) * 13) % 11;
      let status: AttendanceStatus = h === 0 ? "absent" : h === 1 ? "late" : "present";
      if (approvedLeaveOn(p[0], date)) status = "on-leave";
      let checkIn: string | null = null;
      let checkOut: string | null = null;
      const flags: AttendanceFlag[] = [];
      if (status === "present" || status === "late") {
        checkIn = minutesAfter(date, shift.start, status === "late" ? 14 + h * 6 : -(h % 5));
        if (d < 0) {
          if (h === 3) flags.push("no-check-out");
          else checkOut = minutesAfter(date, shift.end, h % 4);
        } else if (pi % 3 === 0) {
          checkOut = null;
        }
      }
      if (d === 0 && status !== "on-leave" && status !== "absent" && pi % 5 === 4) {
        status = "not-yet";
        checkIn = null;
        checkOut = null;
      }
      attendance.push({
        id: `at-${p[0]}-${date}`,
        reference: `BLV-ATT-PLACEHOLDER-${++n}`,
        date,
        staff: person(pi),
        clientId: o.clientId,
        client: clientName(o.id),
        outletId: o.id,
        outlet: o.name,
        role: p[2],
        shiftLabel: shift.label,
        shiftStart: shift.start,
        shiftEnd: shift.end,
        checkIn,
        checkOut,
        status,
        flags,
        note: null,
        pendingCorrection: null,
        history: [entry("Recorded", "System", null, status, null, at(date, shift.start))],
      });
    });
  }
  // One pending correction and one applied correction so both states can be seen.
  const pend = attendance.find((r) => r.status === "absent" && r.date < today);
  if (pend) {
    pend.flags = ["correction-requested"];
    pend.pendingCorrection = { id: "cr-1", requestedBy: ME, at: nowIso(), reason: "Staff member says the clock-in device was offline; supervisor confirms they worked.", proposedCheckIn: pend.shiftStart, proposedCheckOut: pend.shiftEnd };
    pend.history.push(entry("Requested a correction", ME, null, null, pend.pendingCorrection.reason));
  }
  const done = attendance.find((r) => r.status === "late" && r.date < today && !r.flags.length);
  if (done) {
    done.flags = ["corrected"];
    done.history.push(entry("Correction applied", "Kelechi Sample", "Late", "Late", "Check-in time adjusted after the supervisor confirmed the device clock was wrong."));
  }
}

function attMatches(r: AttRec, q: AttendanceQuery, withTab: boolean) {
  if (!clientIdInScope(r.clientId)) return false;
  if (q.from && r.date < q.from) return false;
  if (q.to && r.date > q.to) return false;
  if (q.clientId && r.clientId !== q.clientId) return false;
  if (q.outletId && r.outletId !== q.outletId) return false;
  const s = q.search.trim().toLowerCase();
  if (s && !`${r.staff.name} ${r.outlet} ${r.client} ${r.role}`.toLowerCase().includes(s)) return false;
  if (withTab && q.tab !== "all") {
    if (q.tab === "corrections") return r.flags.includes("correction-requested");
    return r.status === q.tab;
  }
  return true;
}

const toRow = (r: AttRec): AttendanceRow => {
  const { reference: _r, note: _n, pendingCorrection: _p, history: _h, ...row } = r;
  void _r; void _n; void _p; void _h;
  return row;
};
const toDetail = (r: AttRec): AttendanceDetail => ({ ...toRow(r), reference: r.reference, note: r.note, pendingCorrection: r.pendingCorrection, history: [...r.history], canRequestCorrection: !r.pendingCorrection && canDo("attendance.edit") });

/* ---------- schedule ---------- */

type Shift = ShiftRow & { outletId: string };
let shifts: Shift[] = [];
let sid = 0;
const published = new Map<string, { at: string; by: string }>();
const weekMeta = new Map<string, { createdBy: string; createdAt: string; lastEditedBy: string; lastEditedAt: string }>();
const touch = (outletId: string, weekStart: ISODate) => {
  const k = wkKey(outletId, weekStart);
  const now = nowIso();
  const cur = weekMeta.get(k);
  weekMeta.set(k, { createdBy: cur?.createdBy ?? ME, createdAt: cur?.createdAt ?? now, lastEditedBy: ME, lastEditedAt: now });
};
const weekHistory = new Map<string, HistoryEntry[]>();
const wkKey = (outletId: string, weekStart: ISODate) => `${outletId}|${weekStart}`;
const wkHist = (outletId: string, weekStart: ISODate) => {
  const k = wkKey(outletId, weekStart);
  if (!weekHistory.has(k)) weekHistory.set(k, []);
  return weekHistory.get(k)!;
};

function seedSchedule() {
  const thisWeek = startOfWeek(todayISO());
  shifts = [];
  published.clear();
  weekMeta.clear();
  weekHistory.clear();
  sid = 0;
  for (const wOff of [-7, 0, 7]) {
    const weekStart = addDays(thisWeek, wOff);
    PEOPLE.forEach((p, pi) => {
      for (let d = 0; d < 7; d++) {
        const date = addDays(weekStart, d);
        if ((d + pi) % 7 === 0 || (d + pi) % 7 === 3) continue; // two days off
        const t = SHIFT_TIMES[pi % 2];
        let state: Shift["state"] = wOff < 0 ? "published" : wOff === 0 ? "published" : "draft";
        if (wOff === 0 && pi === 2 && d === 4) state = "changed";
        if (wOff === 0 && pi === 3 && d === 5) state = "draft";
        if (wOff === 0 && pi === 4 && d === 6) state = "removing";
        shifts.push({ id: `sh-${++sid}`, outletId: p[4], date, staff: person(pi), role: p[2], section: p[3], start: t.start, end: t.end, breakMins: 30, state, createdBy: "Kelechi Sample", lastEditedBy: state === "published" ? "Kelechi Sample" : ME, lastEditedAt: minutesAfter(addDays(weekStart, -4), "15:00", pi), conflicts: [] });
      }
    });
  }
  for (const o of OUTLETS) {
    for (const wOff of [-7, 0]) {
      const ws = addDays(thisWeek, wOff);
      published.set(wkKey(o.id, ws), { at: minutesAfter(addDays(ws, -3), "16:00", 0), by: "Kelechi Sample" });
      weekMeta.set(wkKey(o.id, ws), { createdBy: "Kelechi Sample", createdAt: minutesAfter(addDays(ws, -6), "10:00", 0), lastEditedBy: wOff === 0 ? ME : "Kelechi Sample", lastEditedAt: minutesAfter(addDays(ws, wOff === 0 ? -1 : -3), "15:30", 0) });
      wkHist(o.id, ws).push(entry("Published the week", "Kelechi Sample", null, null, null, minutesAfter(addDays(ws, -3), "16:00", 0)));
    }
  }
}

function rosterFor(outletId: string, weekStart: ISODate): WeekRoster {
  const o = outletOf(outletId);
  const end = addDays(weekStart, 6);
  const list = shifts
    .filter((s) => s.outletId === outletId && s.date >= weekStart && s.date <= end)
    .map(({ outletId: _o, ...s }) => (void _o, { ...s, conflicts: conflictsFor(s.id, s.staff.id, s.date, s) }));
  list.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.staff.name.localeCompare(b.staff.name));
  const pub = published.get(wkKey(outletId, weekStart));
  const meta = weekMeta.get(wkKey(outletId, weekStart));
  const first = list[0];
  const prevStart = addDays(weekStart, -7);
  const staff: RosterStaff[] = PEOPLE.filter((p) => p[4] === outletId).map((p) => ({ id: p[0], name: p[1], role: p[2], section: p[3] }));
  return {
    weekStart,
    outletId,
    outlet: o.name,
    client: clientName(outletId),
    shifts: list,
    unpublishedCount: list.filter((s) => s.state !== "published").length,
    lastPublishedAt: pub?.at ?? null,
    lastPublishedBy: pub?.by ?? null,
    staff,
    history: [...wkHist(outletId, weekStart)],
    sections: getDepartments().map((x) => x.name),
    roles: getRoles().map((x) => x.name),
    canCopyLastWeek: shifts.some((s) => s.outletId === outletId && s.date >= prevStart && s.date < weekStart && s.state !== "removing"),
    published: !!pub,
    createdBy: meta?.createdBy ?? first?.createdBy ?? ME,
    createdAt: meta?.createdAt ?? first?.lastEditedAt ?? nowIso(),
    lastEditedBy: meta?.lastEditedBy ?? first?.lastEditedBy ?? ME,
    lastEditedAt: meta?.lastEditedAt ?? first?.lastEditedAt ?? nowIso(),
    canCreateSchedule: true,
    canPublishSchedule: mayPublish(),
  };
}
const weekOf = (date: ISODate) => startOfWeek(date);

function conflictsFor(selfId: string, staffId: string, date: ISODate, t: { start: string; end: string }): ShiftConflict[] {
  const out: ShiftConflict[] = [];
  for (const s of shifts) {
    if (s.id === selfId || s.staff.id !== staffId || s.date !== date || s.state === "removing") continue;
    if (overlap(t, s)) out.push({ id: s.id, kind: "double-booking", label: `Overlaps ${s.start} to ${s.end} at ${outletOf(s.outletId).name}.` });
  }
  if (approvedLeaveOn(staffId, date)) out.push({ id: "leave", kind: "leave", label: "Approved leave on this day." });
  return out;
}

const overlap = (a: { start: string; end: string }, b: { start: string; end: string }) => a.start < b.end && b.start < a.end;

function validateShift(outletId: string, input: ShiftInput) {
  if (personById(input.staffId) < 0 || PEOPLE[personById(input.staffId)][4] !== outletId) throw new Error("Staff member is not assigned to this outlet");
  if (!input.date || !input.start || !input.end || input.end <= input.start) throw new Error("Invalid times");
}

/* ---------- warnings ---------- */

type WarnRec = WarningDetail;
let warnings: WarnRec[] = [];
let wn = 0;

function seedWarnings() {
  const today = todayISO();
  /** person, type, severity, status, days ago, requires ack, details */
  const seeds: [number, string, string, WarningStatus, number, boolean, string][] = [
    [6, "Attendance", "Low", "issued", 2, true, "Arrived more than 30 minutes after the start of the shift on three occasions this month. Discussed with the supervisor on site."],
    [9, "Conduct", "High", "acknowledged", 25, true, "Sample entry for layout only. Real records come from the adapter."],
    [3, "Policy", "Medium", "disputed", 12, true, "Sample entry for layout only. The staff member disagrees with the record."],
    [10, "Performance", "Low", "withdrawn", 60, true, "Sample entry for layout only."],
    [13, "Attendance", "Medium", "issued", 6, true, "Did not report for a rostered shift without notice."],
    [0, "Conduct", "Low", "acknowledged", 40, false, "Verbal reminder recorded for the file."],
    [11, "Policy", "Low", "issued", 1, false, "Reminder about the uniform standard. Recorded for information; no acknowledgement requested."],
  ];
  warnings = seeds.map(([pi, type, severity, status, ago, ack, details], i) => {
    const p = PEOPLE[pi];
    const o = outletOf(p[4]);
    const date = addDays(today, -ago);
    const issuedAt = minutesAfter(date, "14:00", 0);
    const ackState: AckState = !ack ? "not-required" : status === "issued" ? "awaiting" : "acknowledged";
    const history: HistoryEntry[] = [entry("Issued", ME, null, "Issued", null, issuedAt)];
    if (status === "acknowledged" || status === "disputed" || status === "withdrawn") history.push(entry("Acknowledged by staff", p[1], "Issued", "Acknowledged", null, minutesAfter(date, "17:30", 0)));
    if (status === "disputed") history.push(entry("Disputed by staff", p[1], "Acknowledged", "Disputed", "The staff member says the dates are wrong.", minutesAfter(addDays(date, 2), "10:00", 0)));
    if (status === "withdrawn") history.push(entry("Withdrawn", "Kelechi Sample", "Acknowledged", "Withdrawn", "Issued against the wrong staff member's record.", minutesAfter(addDays(date, 3), "10:00", 0)));
    return {
      id: `wr-${String(i + 1).padStart(3, "0")}`,
      reference: `BLV-WRN-PLACEHOLDER-${++wn}`,
      staff: person(pi),
      clientId: o.clientId,
      client: clientName(o.id),
      outletId: o.id,
      outlet: o.name,
      type,
      severity,
      issuedBy: i % 3 === 1 ? "Kelechi Sample" : ME,
      effectiveDate: date,
      status,
      ack: ackState,
      acknowledgedAt: ackState === "acknowledged" ? minutesAfter(date, "17:30", 0) : null,
      details,
      issuedAt,
      requiresAcknowledgement: ack,
      withdrawnReason: status === "withdrawn" ? "Issued against the wrong staff member's record." : null,
      disputeNote: status === "disputed" ? "The staff member says the dates are wrong." : null,
      history,
      canWithdraw: status !== "withdrawn",
    };
  });
}

const toWarnRow = (w: WarnRec): WarningRow => ({
  id: w.id,
  reference: w.reference,
  staff: w.staff,
  clientId: w.clientId,
  client: w.client,
  outletId: w.outletId,
  outlet: w.outlet,
  type: w.type,
  severity: w.severity,
  issuedBy: w.issuedBy,
  effectiveDate: w.effectiveDate,
  status: w.status,
  ack: w.ack,
  acknowledgedAt: w.acknowledgedAt,
});

function warnMatches(w: WarnRec, q: WarningsQuery, withTab: boolean) {
  if (!clientIdInScope(w.clientId)) return false;
  if (q.clientId && w.clientId !== q.clientId) return false;
  if (q.outletId && w.outletId !== q.outletId) return false;
  if (q.type && w.type !== q.type) return false;
  const s = q.search.trim().toLowerCase();
  if (s && !`${w.staff.name} ${w.type} ${w.reference} ${w.outlet}`.toLowerCase().includes(s)) return false;
  return withTab && q.tab !== "all" ? w.status === q.tab : true;
}

/* ---------- state ---------- */

let ready = false;
function reset() {
  seedLeave();
  seedAttendance();
  seedSchedule();
  seedWarnings();
  ready = true;
}
function ensure() {
  if (!ready) reset();
}

const canApprove = () => canDo("leave.decide") && !(typeof window !== "undefined" && new URLSearchParams(window.location.search).get("approve") === "off");

function emptyAttendance(): AttendancePage {
  return { rows: [], total: 0, tabCounts: { all: 0, present: 0, late: 0, absent: 0, "on-leave": 0, corrections: 0 }, today: { date: todayISO(), scheduled: 0, checkedIn: 0, notYet: 0, late: 0, absent: 0, onLeave: 0 }, facets: scopedFacets(), workspaceEmpty: true };
}

export const mockWorkforceAdapter: WorkforceAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /* ---- attendance ---- */
  async listAttendance(q) {
    const mode = await previewGate();
    if (mode === "empty") return emptyAttendance();
    ensure();
    const base = attendance.filter((r) => attMatches(r, q, false));
    const count = (tab: AttendanceTab) => base.filter((r) => attMatches(r, { ...q, tab }, true)).length;
    const list = base.filter((r) => attMatches(r, q, true)).sort((a, b) => b.date.localeCompare(a.date) || a.staff.name.localeCompare(b.staff.name));
    const today = todayISO();
    const t = attendance.filter((r) => r.date === today && clientIdInScope(r.clientId) && (!q.clientId || r.clientId === q.clientId) && (!q.outletId || r.outletId === q.outletId));
    const c = (s: AttendanceStatus) => t.filter((r) => r.status === s).length;
    return {
      rows: list.slice(0, q.pageSize).map(toRow),
      total: list.length,
      tabCounts: { all: count("all"), present: count("present"), late: count("late"), absent: count("absent"), "on-leave": count("on-leave"), corrections: count("corrections") },
      today: { date: today, scheduled: t.length, checkedIn: c("present") + c("late"), notYet: c("not-yet"), late: c("late"), absent: c("absent"), onLeave: c("on-leave") },
      facets: scopedFacets(),
      workspaceEmpty: !attendance.some((r) => clientIdInScope(r.clientId)),
    };
  },

  async getAttendance(id) {
    const mode = await previewGate(250);
    if (mode === "empty") return null;
    ensure();
    const r = attendance.find((x) => x.id === id);
    if (r && !clientIdInScope(r.clientId)) throw new RestrictedError();
    return r ? toDetail(r) : null;
  },

  async requestCorrection(id, input: CorrectionInput) {
    await sleep(400);
    ensure();
    const r = attendance.find((x) => x.id === id);
    if (!r || r.pendingCorrection) throw new Error("Not allowed");
    if (!input.reason.trim()) throw new Error("Reason required");
    r.pendingCorrection = { id: `cr-${++hid}`, requestedBy: ME, at: nowIso(), reason: input.reason, proposedCheckIn: input.proposedCheckIn || null, proposedCheckOut: input.proposedCheckOut || null };
    r.flags = [...r.flags.filter((f) => f !== "correction-requested"), "correction-requested"];
    r.history.push(entry("Requested a correction", ME, null, null, input.reason));
    return toDetail(r);
  },

  /* ---- leave ---- */
  async listLeave(q: LeaveQuery): Promise<LeavePage> {
    const mode = await previewGate();
    const approve = canApprove();
    if (mode === "empty") return { rows: [], total: 0, tabCounts: { pending: 0, approved: 0, declined: 0, cancelled: 0 }, whoIsOff: [], facets: { ...scopedFacets(), types: leaveTypeNames() }, canApprove: approve, workspaceEmpty: true };
    ensure();
    const s = q.search.trim().toLowerCase();
    const visibleLeave = leave.filter((l) => clientIdInScope(l.clientId));
    const base = visibleLeave.filter((l) => (!q.clientId || l.clientId === q.clientId) && (!q.outletId || l.outletId === q.outletId) && (!q.type || l.type === q.type) && (!s || `${l.staff.name} ${l.outlet} ${l.type}`.toLowerCase().includes(s)));
    const count = (st: LeaveStatus) => base.filter((l) => l.status === st).length;
    const list = base.filter((l) => l.status === q.tab).sort((a, b) => (q.tab === "pending" ? a.startDate.localeCompare(b.startDate) : b.startDate.localeCompare(a.startDate)));
    const today = todayISO();
    const whoIsOff = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i);
      return { date, people: visibleLeave.filter((l) => l.status === "approved" && l.startDate <= date && date <= l.endDate && (!q.clientId || l.clientId === q.clientId) && (!q.outletId || l.outletId === q.outletId)).map((l) => l.staff) };
    });
    return { rows: list.slice(0, q.pageSize), total: list.length, tabCounts: { pending: count("pending"), approved: count("approved"), declined: count("declined"), cancelled: count("cancelled") }, whoIsOff, facets: { ...scopedFacets(), types: leaveTypeNames() }, canApprove: approve, workspaceEmpty: visibleLeave.length === 0 };
  },

  async listTimeOff(q: TimeOffQuery): Promise<TimeOffResult> {
    const mode = await previewGate(250);
    if (mode === "empty") return { days: [], entries: [], workspaceEmpty: true };
    ensure();
    const needle = q.search.trim().toLowerCase();
    const visible = leave.filter((l) => l.status === "approved" && clientIdInScope(l.clientId));
    const inRange = visible.filter((l) => l.startDate <= q.to && l.endDate >= q.from && (!needle || l.staff.name.toLowerCase().includes(needle)));
    const days: TimeOffResult["days"] = [];
    for (let date = q.from, guard = 0; date <= q.to && guard < 400; date = addDays(date, 1), guard++) {
      days.push({ date, people: inRange.filter((l) => l.startDate <= date && date <= l.endDate).map((l) => ({ ...l.staff, type: l.type, requestId: l.id })) });
    }
    const entries = inRange.map((l) => ({ id: l.id, staff: l.staff, type: l.type, startDate: l.startDate, endDate: l.endDate, days: l.days, outlet: l.outlet, client: l.client, decidedBy: l.decidedBy, decidedAt: l.decidedAt })).sort((a, b) => a.startDate.localeCompare(b.startDate));
    return { days, entries, workspaceEmpty: visible.length === 0 };
  },

  async getStaffLeaveHistory(staffId): Promise<StaffLeaveHistory | null> {
    const mode = await previewGate(250);
    if (mode === "empty") return { takenThisYear: 0, balance: null, requests: [] };
    ensure();
    const pi = personById(staffId);
    if (pi >= 0 && !clientIdInScope(outletOf(PEOPLE[pi][4]).clientId)) return null;
    const mine = leave.filter((l) => l.staff.id === staffId).sort((a, b) => b.startDate.localeCompare(a.startDate));
    const today = todayISO();
    const year = today.slice(0, 4);
    const taken = mine
      .filter((l) => l.status === "approved" && l.startDate <= today && l.startDate.startsWith(year))
      .reduce((sum, l) => sum + days(l.startDate, l.endDate < today ? l.endDate : today), 0);
    const withBalance = mine.find((l) => l.balance);
    return {
      takenThisYear: taken,
      balance: withBalance?.balance ? { remaining: withBalance.balance.remaining, unit: withBalance.balance.unit } : null,
      requests: mine.map((l) => ({ id: l.id, type: l.type, startDate: l.startDate, endDate: l.endDate, days: l.days, status: l.status })),
    };
  },

  async approveLeave(id) {
    await sleep(350);
    ensure();
    const l = leave.find((x) => x.id === id);
    if (!l || l.status !== "pending" || !canApprove()) throw new Error("Not allowed");
    l.status = "approved";
    l.decidedBy = ME;
    l.decidedAt = nowIso();
    l.history = [...l.history, entry("Approved", ME, "Pending", "Approved")];
    return { ...l };
  },

  async declineLeave(id, input) {
    await sleep(350);
    ensure();
    const l = leave.find((x) => x.id === id);
    if (!l || l.status !== "pending" || !canApprove() || !input.reason.trim()) throw new Error("Not allowed");
    l.status = "declined";
    l.decidedBy = ME;
    l.decidedAt = nowIso();
    l.decisionNote = input.reason;
    l.history = [...l.history, entry("Declined", ME, "Pending", "Declined", input.reason)];
    return { ...l };
  },

  /* ---- scheduling ---- */
  async getSchedule(q): Promise<SchedulePage> {
    const mode = await previewGate();
    if (mode === "empty") return { facets: scopedFacets(), roster: null, workspaceEmpty: true };
    ensure();
    const facets = scopedFacets();
    // No outlet in scope (an HR officer with no assigned clients): the no-clients empty state, no roster.
    if (facets.outlets.length === 0) return { facets, roster: null, workspaceEmpty: true };
    if (q.outletId && OUTLETS.some((o) => o.id === q.outletId)) assertOutletInScope(q.outletId);
    const outletId = OUTLETS.some((o) => o.id === q.outletId) ? q.outletId : facets.outlets[0].id;
    return { facets, roster: rosterFor(outletId, startOfWeek(q.weekStart)), workspaceEmpty: false };
  },

  async checkShiftConflicts(_outletId, shiftId, input): Promise<ShiftConflict[]> {
    await sleep(150);
    ensure();
    if (!input.staffId || !input.date || !input.start || !input.end || input.end <= input.start) return [];
    return conflictsFor(shiftId ?? "", input.staffId, input.date, input);
  },

  async saveShift(outletId, shiftId, input) {
    await sleep(350);
    ensure();
    assertOutletInScope(outletId);
    validateShift(outletId, input);
    touch(outletId, weekOf(input.date));
    const p = PEOPLE[personById(input.staffId)];
    const weekStart = weekOf(input.date);
    if (shiftId) {
      const s = shifts.find((x) => x.id === shiftId && x.outletId === outletId);
      if (!s) throw new Error("Not found");
      Object.assign(s, { staff: person(personById(input.staffId)), role: input.role, section: input.section, start: input.start, end: input.end, breakMins: input.breakMins, date: input.date, lastEditedBy: ME, lastEditedAt: nowIso(), state: s.state === "published" || s.state === "changed" ? "changed" : "draft" });
      wkHist(outletId, weekStart).push(entry("Edited a shift", ME, null, null, `${p[1]}, ${input.date}, ${input.start} to ${input.end}`));
    } else {
      shifts.push({ id: `sh-${++sid}`, outletId, date: input.date, staff: person(personById(input.staffId)), role: input.role, section: input.section, start: input.start, end: input.end, breakMins: input.breakMins, state: "draft", createdBy: ME, lastEditedBy: ME, lastEditedAt: nowIso(), conflicts: [] });
      wkHist(outletId, weekStart).push(entry("Added a shift", ME, null, null, `${p[1]}, ${input.date}, ${input.start} to ${input.end}`));
    }
    return rosterFor(outletId, weekStart);
  },

  async removeShift(outletId, shiftId) {
    await sleep(300);
    ensure();
    assertOutletInScope(outletId);
    const s = shifts.find((x) => x.id === shiftId && x.outletId === outletId);
    if (!s) throw new Error("Not found");
    const weekStart = weekOf(s.date);
    touch(outletId, weekStart);
    if (s.state === "draft") shifts = shifts.filter((x) => x.id !== shiftId);
    else s.state = "removing";
    wkHist(outletId, weekStart).push(entry("Removed a shift", ME, null, null, `${s.staff.name}, ${s.date}, ${s.start} to ${s.end}`));
    return rosterFor(outletId, weekStart);
  },

  async publishWeek(outletId, weekStart) {
    await sleep(450);
    ensure();
    assertOutletInScope(outletId);
    if (!mayPublish()) throw new Error("Not allowed");
    const end = addDays(weekStart, 6);
    shifts = shifts.filter((s) => !(s.outletId === outletId && s.date >= weekStart && s.date <= end && s.state === "removing"));
    let n = 0;
    for (const s of shifts) if (s.outletId === outletId && s.date >= weekStart && s.date <= end && s.state !== "published") {
      s.state = "published";
      n++;
    }
    published.set(wkKey(outletId, weekStart), { at: nowIso(), by: ME });
    touch(outletId, weekStart);
    wkHist(outletId, weekStart).push(entry("Published the week", ME, null, null, `${n} change${n === 1 ? "" : "s"} are now visible to staff`));
    return rosterFor(outletId, weekStart);
  },

  async unpublishWeek(outletId, weekStart) {
    await sleep(450);
    ensure();
    assertOutletInScope(outletId);
    if (!mayPublish()) throw new Error("Not allowed");
    const end = addDays(weekStart, 6);
    shifts = shifts.filter((s) => !(s.outletId === outletId && s.date >= weekStart && s.date <= end && s.state === "removing"));
    for (const s of shifts) if (s.outletId === outletId && s.date >= weekStart && s.date <= end) s.state = "draft";
    published.delete(wkKey(outletId, weekStart));
    touch(outletId, weekStart);
    wkHist(outletId, weekStart).push(entry("Unpublished the week", ME, "Published", "Not published", "Staff no longer see this week. All shifts are drafts again."));
    return rosterFor(outletId, weekStart);
  },

  async copyLastWeek(outletId, weekStart) {
    await sleep(450);
    ensure();
    assertOutletInScope(outletId);
    const prev = addDays(weekStart, -7);
    const prevEnd = addDays(prev, 6);
    const src = shifts.filter((s) => s.outletId === outletId && s.date >= prev && s.date <= prevEnd && s.state !== "removing");
    let n = 0;
    for (const s of src) {
      const date = addDays(s.date, 7);
      if (shifts.some((x) => x.outletId === outletId && x.staff.id === s.staff.id && x.date === date && x.state !== "removing")) continue;
      shifts.push({ ...s, id: `sh-${++sid}`, date, state: "draft", createdBy: ME, lastEditedBy: ME, lastEditedAt: nowIso() });
      n++;
    }
    touch(outletId, weekStart);
    wkHist(outletId, weekStart).push(entry("Copied last week", ME, null, null, `${n} shift${n === 1 ? "" : "s"} added as unpublished drafts`));
    return rosterFor(outletId, weekStart);
  },

  /* ---- warnings ---- */
  async listWarnings(q): Promise<WarningsPage> {
    const mode = await previewGate();
    const options = { types: warningTypeNames(false), severities: getWarningLevels().map((x) => x.name), staff: PEOPLE.map((p) => ({ id: p[0], name: p[1], client: clientName(p[4]), outlet: outletOf(p[4]).name })) };
    if (mode === "empty") return { rows: [], total: 0, tabCounts: { all: 0, issued: 0, acknowledged: 0, disputed: 0, withdrawn: 0 }, facets: { ...scopedFacets(), types: warningTypeNames() }, options, canIssue: true, workspaceEmpty: true };
    ensure();
    const base = warnings.filter((w) => warnMatches(w, q, false));
    const count = (tab: WarningTab) => base.filter((w) => warnMatches(w, { ...q, tab }, true)).length;
    const list = base.filter((w) => warnMatches(w, q, true)).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    return {
      rows: list.slice(0, q.pageSize).map(toWarnRow),
      total: list.length,
      tabCounts: { all: count("all"), issued: count("issued"), acknowledged: count("acknowledged"), disputed: count("disputed"), withdrawn: count("withdrawn") },
      facets: { ...scopedFacets(), types: warningTypeNames() },
      options,
      canIssue: true,
      workspaceEmpty: false,
    };
  },

  async getWarning(id) {
    const mode = await previewGate(250);
    if (mode === "empty") return null;
    ensure();
    const w = warnings.find((x) => x.id === id);
    if (w && !clientIdInScope(w.clientId)) throw new RestrictedError();
    return w ? { ...w, history: [...w.history] } : null;
  },

  async issueWarning(input: WarningInput) {
    await sleep(450);
    ensure();
    const pi = personById(input.staffId);
    if (pi < 0 || !input.details.trim() || !input.type || !input.severity || !input.effectiveDate) throw new Error("Invalid");
    const p = PEOPLE[pi];
    const o = outletOf(p[4]);
    const w: WarnRec = {
      id: `wr-${String(warnings.length + 1).padStart(3, "0")}`,
      reference: `BLV-WRN-PLACEHOLDER-${++wn}`,
      staff: person(pi),
      clientId: o.clientId,
      client: clientName(o.id),
      outletId: o.id,
      outlet: o.name,
      type: input.type,
      severity: input.severity,
      issuedBy: ME,
      effectiveDate: input.effectiveDate,
      status: "issued",
      ack: input.requiresAcknowledgement ? "awaiting" : "not-required",
      acknowledgedAt: null,
      details: input.details.trim(),
      issuedAt: nowIso(),
      requiresAcknowledgement: input.requiresAcknowledgement,
      withdrawnReason: null,
      disputeNote: null,
      history: [entry("Issued", ME, null, "Issued")],
      canWithdraw: true,
    };
    warnings = [w, ...warnings];
    return { ...w };
  },

  async withdrawWarning(id, input) {
    await sleep(350);
    ensure();
    const w = warnings.find((x) => x.id === id);
    if (!w || w.status === "withdrawn" || !input.reason.trim()) throw new Error("Not allowed");
    w.history = [...w.history, entry("Withdrawn", ME, w.status === "issued" ? "Issued" : w.status === "acknowledged" ? "Acknowledged" : "Disputed", "Withdrawn", input.reason)];
    w.status = "withdrawn";
    w.withdrawnReason = input.reason;
    w.canWithdraw = false;
    return { ...w };
  },
};
