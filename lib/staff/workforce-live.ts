/**
 * Staff shifts and attendance, LIVE (/api/staff/workforce/*, docs/contracts/workforce-shifts-attendance.sql).
 * Only PUBLISHED shifts are returned; check-in / out windows and late rules live in the database, never here.
 */
import type { AttendanceRecord, AttendanceState, DateRange, LeaveRequest, LeaveRequestInput, Shift, TodayAttendance } from "./types";

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const REASON: Record<string, string> = {
  too_early: "Check-in opens 2 hours before your shift starts.",
  shift_over: "This shift has ended, so it can no longer be recorded here. Tell your HR officer.",
  not_checked_in: "Check in first.",
};

async function call(action: string, body: Rec): Promise<Rec> {
  const res = await fetch(`/api/staff/workforce/${action}`, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = rec(await res.json().catch(() => null));
  if (j?.ok === true) return j;
  throw new Error(REASON[str(j?.reason)] ?? "We couldn't reach Beeliv. Please try again.");
}

type LiveShift = Shift & { startsAt: string; endsAt: string; checkIn: string | null; checkOut: string | null };
function shift(raw: unknown): LiveShift | null {
  const s = rec(raw);
  if (!s) return null;
  const status = (["scheduled", "updated", "cancelled", "completed"].includes(str(s.status)) ? str(s.status) : "scheduled") as Shift["status"];
  return {
    id: str(s.id), date: str(s.date), startTime: str(s.start), endTime: str(s.end), client: str(s.client), outlet: str(s.outlet), location: str(s.location),
    role: str(s.role), section: str(s.section), status, notes: null, agenda: [],
    startsAt: str(s.startsAt), endsAt: str(s.endsAt), checkIn: str(s.checkIn) || null, checkOut: str(s.checkOut) || null,
  };
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const plus = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

async function shifts(from: string, to: string): Promise<LiveShift[]> {
  const r = await call("my-shifts", { from, to });
  return (Array.isArray(r.items) ? r.items : []).map(shift).filter((x): x is LiveShift => !!x);
}

export async function liveSchedule(range: DateRange): Promise<Shift[]> {
  return shifts(range.from, range.to);
}

/** Today's shift: the one in progress, else the next one today, else the last one that ended today. */
export async function liveToday(): Promise<TodayAttendance> {
  const now = new Date();
  const list = (await shifts(iso(plus(now, -1)), iso(plus(now, 1)))).filter((s) => s.status !== "cancelled");
  const t = now.getTime();
  const relevant = list.filter((s) => Date.parse(s.endsAt) + 6 * 3_600_000 > t && Date.parse(s.startsAt) - 18 * 3_600_000 < t);
  const current = relevant.find((s) => s.checkIn && !s.checkOut) ?? relevant.find((s) => !s.checkIn && Date.parse(s.endsAt) > t) ?? relevant[relevant.length - 1];
  if (!current) return { state: "no-shift", shift: null, checkedInAt: null, checkedOutAt: null, attentionReason: null };
  const start = Date.parse(current.startsAt), end = Date.parse(current.endsAt);
  let state: AttendanceState;
  let attentionReason: string | null = null;
  if (current.checkOut) state = "checked-out";
  else if (current.checkIn) state = "checked-in";
  else if (t > end) { state = "attention"; attentionReason = "This shift ended without a check-in. Tell your HR officer."; }
  else if (t >= start - 2 * 3_600_000) state = "ready";
  else state = "upcoming";
  return { state, shift: current, checkedInAt: current.checkIn, checkedOutAt: current.checkOut, attentionReason };
}

export async function liveCheck(kind: "in" | "out"): Promise<TodayAttendance> {
  const today = await liveToday();
  if (!today.shift) throw new Error("You have no shift right now.");
  await call(kind === "in" ? "check-in" : "check-out", { shiftId: today.shift.id });
  return liveToday();
}

export async function liveAttendanceHistory(): Promise<AttendanceRecord[]> {
  const now = new Date();
  const list = await shifts(iso(plus(now, -60)), iso(now));
  return list
    .filter((s) => Date.parse(s.startsAt) <= now.getTime())
    .reverse()
    .map((s) => ({ id: s.id, date: s.date, shiftId: s.id, checkedInAt: s.checkIn, checkedOutAt: s.checkOut,
      status: s.checkIn ? "recorded" : Date.parse(s.endsAt) < now.getTime() ? "attention" : "recorded" }));
}

export async function liveHomeShifts(): Promise<{ todaysShifts: Shift[]; upcoming: Shift[]; recentAttendance: AttendanceRecord[] }> {
  const now = new Date();
  const [list, history] = await Promise.all([shifts(iso(now), iso(plus(now, 14))), liveAttendanceHistory()]);
  const today = iso(now);
  return { todaysShifts: list.filter((s) => s.date === today), upcoming: list.filter((s) => s.date > today).slice(0, 5), recentAttendance: history.slice(0, 5) };
}

/* ---------- leave (workforce-leave.sql) ---------- */
const LEAVE_REASON: Record<string, string> = {
  overlap: "You already have leave on some of these dates.",
  invalid_request: "Check the dates. Leave can't start in the past (sick leave can go back up to 7 days) and lasts at most 60 days.",
  invalid_transition: "This request can no longer be cancelled.",
};
async function leaveCall(action: string, body: Rec): Promise<Rec> {
  const res = await fetch(`/api/staff/workforce/${action}`, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = rec(await res.json().catch(() => null));
  if (j?.ok === true) return j;
  throw new Error(LEAVE_REASON[str(j?.reason)] ?? "We couldn't reach Beeliv. Please try again.");
}
function leaveItem(raw: unknown): LeaveRequest | null {
  const l = rec(raw);
  if (!l) return null;
  const st = str(l.status);
  return { id: str(l.id), type: str(l.type), startDate: str(l.startDate), endDate: str(l.endDate), reason: str(l.reason) || null,
    status: (st === "declined" ? "rejected" : ["pending", "approved", "cancelled"].includes(st) ? st : "pending") as LeaveRequest["status"],
    submittedAt: str(l.submittedAt), decisionNote: str(l.decisionNote) || null, attachmentName: null, canCancel: l.canCancel === true };
}
export async function liveLeaveRequests(): Promise<LeaveRequest[]> {
  const r = await leaveCall("leave-mine", {});
  return (Array.isArray(r.items) ? r.items : []).map(leaveItem).filter((x): x is LeaveRequest => !!x);
}
export async function liveRequestLeave(input: LeaveRequestInput): Promise<LeaveRequest> {
  // Attachments are not stored yet; the request itself is recorded.
  const r = await leaveCall("leave-request", { type: input.type, startDate: input.startDate, endDate: input.endDate, reason: input.reason });
  const mine = await liveLeaveRequests();
  const made = mine.find((l) => l.id === str(r.id));
  if (!made) throw new Error("Your request was sent. Reload to see it.");
  return made;
}
export async function liveCancelLeave(id: string): Promise<LeaveRequest> {
  await leaveCall("leave-cancel", { leaveId: id });
  const mine = await liveLeaveRequests();
  const done = mine.find((l) => l.id === id);
  if (!done) throw new Error("Reload to see this request.");
  return done;
}
