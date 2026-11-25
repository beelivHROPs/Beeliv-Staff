/**
 * Staff warnings (docs/contracts/day2-warnings-requests.sql, part A). Pure input validation, no I/O, so it is unit-tested
 * offline (tests/day2-warnings.test.cjs). The database re-checks every rule (permission, scope, placement, date window,
 * state, revision); this layer only refuses malformed shapes before they reach it. Each parser returns the RPC arguments,
 * or null when anything is wrong. Unknown fields are refused: the browser never names the actor, client or outlet.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null);

/** Same lists the database answers (staff_warning_admin_list) and enforces (staff_warnings.severity check). */
export const WARNING_SEVERITIES = ["Documented counselling", "Written warning", "Final warning"] as const;
export const WARNING_TYPES = ["Lateness", "Absence", "Conduct", "Performance", "Guest complaint", "Grooming", "Policy breach", "Other"] as const;

const only = (r: Rec, keys: string[]) => Object.keys(r).every((k) => keys.includes(k));
const uuid = (v: unknown) => (typeof v === "string" && UUID.test(v) ? v : null);
/** Trimmed text within [min, max] characters, else null. */
const text = (v: unknown, min: number, max: number) => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length >= min && t.length <= max ? t : null;
};
/** A real calendar day in YYYY-MM-DD (2026-02-30 is refused). */
export function realDate(v: unknown): string | null {
  if (typeof v !== "string" || !DATE.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : null;
}

/** list (admin) and mine (staff) take no input at all: the session is the person. */
export function validNoInput(input: unknown): boolean {
  const r = rec(input);
  return !!r && Object.keys(r).length === 0;
}

export function parseWarningIssue(input: unknown) {
  const r = rec(input);
  if (!r || !only(r, ["staffId", "type", "severity", "details", "effectiveDate", "requiresAck"])) return null;
  const personId = uuid(r.staffId);
  const type = typeof r.type === "string" && (WARNING_TYPES as readonly string[]).includes(r.type) ? r.type : null;
  const severity = typeof r.severity === "string" && (WARNING_SEVERITIES as readonly string[]).includes(r.severity) ? r.severity : null;
  const details = text(r.details, 3, 2000);
  const date = realDate(r.effectiveDate);
  if (!personId || !type || !severity || !details || !date || typeof r.requiresAck !== "boolean") return null;
  return { p_person_id: personId, p_type: type, p_severity: severity, p_details: details, p_effective_date: date, p_requires_ack: r.requiresAck };
}

export function parseWarningWithdraw(input: unknown) {
  const r = rec(input);
  if (!r || !only(r, ["warningId", "expectedRevision", "reason"])) return null;
  const id = uuid(r.warningId);
  const rev = r.expectedRevision;
  const reason = text(r.reason, 3, 1000);
  if (!id || !Number.isSafeInteger(rev) || (rev as number) < 1 || (rev as number) > 1_000_000 || !reason) return null;
  return { p_warning_id: id, p_expected_revision: rev as number, p_reason: reason };
}

/** The comment is optional: missing, null or blank all mean "no comment"; otherwise at most 1000 characters. */
export function parseWarningAck(input: unknown) {
  const r = rec(input);
  if (!r || !only(r, ["warningId", "comment"])) return null;
  const id = uuid(r.warningId);
  if (!id) return null;
  if (r.comment == null) return { p_warning_id: id, p_comment: null };
  if (typeof r.comment !== "string") return null;
  const c = r.comment.trim();
  if (c.length > 1000) return null;
  return { p_warning_id: id, p_comment: c || null };
}
