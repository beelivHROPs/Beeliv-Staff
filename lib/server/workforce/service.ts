import "server-only";
import { adminClient, sessionClient } from "../auth/session";
import { AuthFailure } from "../auth/service";
import { limitAuth } from "../auth/rate";

/**
 * Scheduling + attendance (docs/contracts/workforce-shifts-attendance.sql). The database functions re-check every
 * permission, scope and state; this layer only verifies the session, validates shapes and forwards.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null);
const str = (v: unknown) => (typeof v === "string" ? v : "");

async function actor(app: "admin" | "talent") {
  const client = await sessionClient(app);
  const { data: identity, error: identityError } = await client.auth.getUser();
  const { data: proof, error: proofError } = await client.auth.getClaims();
  const user = identity.user; const claims = proof?.claims;
  if (identityError || proofError || !user?.email_confirmed_at || claims?.sub !== user.id || typeof claims.session_id !== "string" || !UUID.test(claims.session_id)) throw new AuthFailure("unauthenticated", 401);
  if (app === "admin" && claims.aal !== "aal2") throw new AuthFailure("mfa_required", 403);
  // Own bucket (lead 2026-11-24 bug: sharing the setup/invite buckets meant normal browsing used them up and the schedule
  // "couldn't load"). Per-action limits are enforced again in the workforce_* database functions.
  await limitAuth(app, app === "admin" ? "org_read" : "staff_enroll_read", `workforce:${user.id}`);
  return { uid: user.id, sessionId: claims.session_id as string };
}

async function call(app: "admin" | "talent", fn: string, args: Rec) {
  const who = await actor(app);
  const { data, error } = await adminClient(app).rpc(fn, { p_actor_uid: who.uid, p_session_id: who.sessionId, ...args });
  if (error) throw new AuthFailure("unavailable", 503);
  const d = rec(data);
  if (d?.ok === false) {
    const reason = str(d.reason);
    if (reason === "no_access") throw new AuthFailure("no_access", 403);
    if (reason === "rate_limited") throw new AuthFailure("rate_limited", 429);
    // Plain business refusals the screens explain (stale, not_placed, too_early, shift_over, ...).
    return { ok: false as const, reason: /^[a-z_]{2,40}$/.test(reason) ? reason : "unavailable" };
  }
  if (d?.ok !== true) throw new AuthFailure("unavailable", 503);
  return d;
}

const bad = () => { throw new AuthFailure("invalid_request", 400); };
const uuidOf = (v: unknown) => (UUID.test(str(v)) ? str(v) : bad());
const dateOf = (v: unknown) => (DATE.test(str(v)) ? str(v) : bad());
const timeOf = (v: unknown) => (TIME.test(str(v)) ? str(v) : bad());
const intOf = (v: unknown, min: number, max: number) => (Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : bad());

export async function workforceAdmin(action: string, input: Rec) {
  switch (action) {
    case "outlets": return call("admin", "workforce_outlets", {});
    case "roster": return call("admin", "workforce_roster", { p_outlet_id: uuidOf(input.outletId), p_week_start: dateOf(input.weekStart) });
    case "shift-save": return call("admin", "workforce_shift_save", {
      p_outlet_id: uuidOf(input.outletId), p_shift_id: input.shiftId == null ? null : uuidOf(input.shiftId),
      p_expected_revision: input.shiftId == null ? null : intOf(input.expectedRevision, 1, 1_000_000),
      p_person_id: uuidOf(input.staffId), p_date: dateOf(input.date), p_start: timeOf(input.start), p_end: timeOf(input.end),
      p_break_mins: intOf(input.breakMins, 0, 240), p_role: str(input.role).slice(0, 80), p_section: str(input.section).slice(0, 80) });
    case "shift-remove": return call("admin", "workforce_shift_remove", { p_shift_id: uuidOf(input.shiftId), p_expected_revision: intOf(input.expectedRevision, 1, 1_000_000) });
    case "week-publish": return call("admin", "workforce_week_publish", { p_outlet_id: uuidOf(input.outletId), p_week_start: dateOf(input.weekStart) });
    case "week-copy": return call("admin", "workforce_week_copy", { p_outlet_id: uuidOf(input.outletId), p_week_start: dateOf(input.weekStart) });
    case "attendance": return call("admin", "workforce_attendance_list", { p_from: dateOf(input.from), p_to: dateOf(input.to) });
    case "leave": return call("admin", "workforce_leave_list", {});
    case "leave-decide": return call("admin", "workforce_leave_decide", { p_leave_id: uuidOf(input.leaveId), p_expected_revision: intOf(input.expectedRevision, 1, 1_000_000),
      p_decision: input.decision === "approve" || input.decision === "decline" ? input.decision : bad(), p_note: str(input.note).slice(0, 1000) });
    default: throw new AuthFailure("invalid_request", 404);
  }
}

export async function workforceStaff(action: string, input: Rec) {
  switch (action) {
    case "my-shifts": return call("talent", "workforce_my_shifts", { p_from: dateOf(input.from), p_to: dateOf(input.to) });
    case "check-in": return call("talent", "workforce_check", { p_shift_id: uuidOf(input.shiftId), p_kind: "in" });
    case "check-out": return call("talent", "workforce_check", { p_shift_id: uuidOf(input.shiftId), p_kind: "out" });
    case "leave-mine": return call("talent", "workforce_leave_mine", {});
    case "leave-request": return call("talent", "workforce_leave_request", { p_type: str(input.type).slice(0, 40), p_start: dateOf(input.startDate), p_end: dateOf(input.endDate), p_reason: str(input.reason).slice(0, 1000) });
    case "leave-cancel": return call("talent", "workforce_leave_cancel", { p_leave_id: uuidOf(input.leaveId) });
    default: throw new AuthFailure("invalid_request", 404);
  }
}
