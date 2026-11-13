/**
 * Browser transport for POST /api/staff/enrollment/{action} (docs/contracts/staff-personal-details-wire.md).
 *
 * Rules this file keeps:
 *  - One requestId per user intent. After an unknown outcome the SAME intent keeps its id; a DIFFERENT change to the same
 *    section is refused locally (nothing is sent) until a read of that section succeeds or the page is reloaded.
 *  - A write is never retried by this file. An unknown outcome is reported and the person decides.
 *  - Sensitive values go out in the request body only. They are never put in a URL, a log, an error message or a toast, and
 *    this file never keeps them: the pending intent stores a short fingerprint of the payload, not the payload.
 *  - Error text is fixed wording. It never contains a value the person typed and never names another account.
 */

export type EnrollmentAction =
  | "personal-get" | "employment-get" | "sensitive-status" | "checklist-get" | "profile-get"
  | "personal-save" | "employer-save" | "kin-save" | "nin-save" | "bank-save" | "accessibility-save";

const WRITES: ReadonlySet<EnrollmentAction> = new Set(["personal-save", "employer-save", "kin-save", "nin-save", "bank-save", "accessibility-save"]);
const TIMEOUT_MS = 15_000;

/** A section's read, used to confirm what a write that ended with an unknown outcome really did. */
const FAMILY: Record<string, string> = {
  "personal-save": "personal", "personal-get": "personal",
  "employer-save": "employment", "employment-get": "employment",
  "kin-save": "sensitive", "nin-save": "sensitive", "bank-save": "sensitive", "accessibility-save": "sensitive", "sensitive-status": "sensitive",
};

export class StaffEnrollmentError extends Error {
  readonly code: string;
  /** Field names the server refused (never their values). */
  readonly fields: Record<string, string>;
  constructor(code: string, message: string, fields: Record<string, string> = {}) {
    super(message); this.name = "StaffEnrollmentError"; this.code = code; this.fields = fields;
  }
}
/** The write may or may not have happened. The same button press repeats the same change safely. */
export class StaffOutcomeUnknownError extends Error {
  readonly requestId: string | null;
  constructor(requestId: string | null) {
    super("We could not confirm that this was saved. Reload and check, or press the button again to repeat the same change.");
    this.name = "StaffOutcomeUnknownError"; this.requestId = requestId;
  }
}
export class StaffUnresolvedIntentError extends Error {
  constructor() {
    super("An earlier change may or may not have been saved. Reload this page and check before making a different change.");
    this.name = "StaffUnresolvedIntentError";
  }
}
/** The screen needs data this slice does not serve yet. It never falls back to sample data. */
export class StaffNotConnectedError extends Error {
  constructor() { super("This part of your Staff app is not available yet."); this.name = "StaffNotConnectedError"; }
}

type Wire = { ok: true; value: unknown } | { ok: false; error: { code?: string; fields?: Record<string, string>; requestId?: string } };

let readSeq = 0;
const pending = new Map<string, { fingerprint: string; id: string; unknownAt: number | null }>();

/** Short non-reversible fingerprint (FNV-1a). Lets the same payload be recognised without keeping what was typed. */
function fingerprint(payload: unknown): string {
  const text = JSON.stringify(payload);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `${h.toString(16)}:${text.length}`;
}

function messageFor(code: string): string {
  switch (code) {
    case "invalid_request": return "Check the details and try again.";
    case "not_saved": return "We couldn't save your changes.";
    case "unauthenticated": return "Your session has ended. Sign in again to continue.";
    case "forbidden": return "Your account can't do that yet.";
    case "conflict": return "That request clashed with an earlier one. Reload the page and try again.";
    case "rate_limited": return "Too many requests. Please wait a few minutes and try again.";
    default: return "This isn't available right now. Please try again in a moment.";
  }
}

export async function enrollmentCall<T>(action: EnrollmentAction, body: Record<string, unknown> = {}, fetcher: typeof fetch = fetch): Promise<T> {
  const write = WRITES.has(action);
  const startedRead = write ? 0 : ++readSeq;
  const requestId = typeof body.requestId === "string" ? body.requestId : null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  let wire: Wire | null = null;
  try {
    response = await fetcher(`/api/staff/enrollment/${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal, cache: "no-store",
    });
    try { wire = (await response.json()) as Wire; } catch { wire = null; }
  } catch {
    throw write ? new StaffOutcomeUnknownError(requestId) : new StaffEnrollmentError("unavailable", messageFor("unavailable"));
  } finally {
    clearTimeout(timer);
  }
  if (wire && wire.ok === true && response.ok) {
    if (!write) confirmRead(action, startedRead);
    return wire.value as T;
  }
  if (!wire || wire.ok !== false || !wire.error || typeof wire.error.code !== "string") {
    throw write ? new StaffOutcomeUnknownError(requestId) : new StaffEnrollmentError("unavailable", messageFor("unavailable"));
  }
  const { code, fields } = wire.error;
  if (code === "outcome_unknown") throw new StaffOutcomeUnknownError(wire.error.requestId ?? requestId);
  throw new StaffEnrollmentError(code, messageFor(code), fields ?? {});
}

function confirmRead(action: string, startedAfter: number): void {
  const family = FAMILY[action];
  if (!family) return;
  for (const [key, p] of pending) {
    if (FAMILY[key] === family && p.unknownAt !== null && startedAfter > p.unknownAt) pending.delete(key);
  }
}

/**
 * Runs one write under an intent key (one requestId per intent). Never retries by itself.
 * `payload` is what goes in the body besides requestId (for example { input }).
 */
export async function enrollmentWrite<T>(action: EnrollmentAction, payload: Record<string, unknown>, fetcher?: typeof fetch): Promise<T> {
  const print = fingerprint(payload);
  const existing = pending.get(action);
  if (existing && existing.fingerprint !== print) throw new StaffUnresolvedIntentError();
  const entry = existing ?? { fingerprint: print, id: crypto.randomUUID(), unknownAt: null };
  pending.set(action, entry);
  try {
    const value = await enrollmentCall<T>(action, { requestId: entry.id, ...payload }, fetcher);
    pending.delete(action);
    return value;
  } catch (error) {
    if (error instanceof StaffOutcomeUnknownError) entry.unknownAt = readSeq;
    else pending.delete(action);
    throw error;
  }
}

/** Plain text for a screen. Fixed wording only: never a typed value, never another account. */
export function enrollmentErrorMessage(error: unknown, fallback = "We couldn't save your changes."): string {
  if (error instanceof StaffEnrollmentError || error instanceof StaffOutcomeUnknownError || error instanceof StaffUnresolvedIntentError || error instanceof StaffNotConnectedError) return error.message;
  return fallback;
}

/** Test and reload helper: forget every pending intent. */
export function resetEnrollmentIntents(): void {
  pending.clear();
}
