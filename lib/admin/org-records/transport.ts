/**
 * Browser transport for POST /api/admin/org-records/{action} (docs/contracts/org-records-wire.md).
 * Maps the wire error codes to typed errors. Never retries a write by itself: an unknown outcome is
 * reported so the person can reload and check, or press the same button again (same requestId).
 */
import { RestrictedError } from "../adapter";
import { ConflictError } from "../ops/adapter";

export type OrgAction =
  | "client-list" | "client-get" | "client-create" | "client-update" | "client-deactivate"
  | "outlet-create" | "outlet-update" | "outlet-deactivate"
  | "staff-list" | "staff-get" | "staff-create" | "staff-update" | "staff-correct-email" | "placement-assign";

/** The record does not exist or is outside the person's scope (the server answers both the same). */
export class OrgNotFoundError extends Error {
  constructor() { super("We could not find that record."); this.name = "OrgNotFoundError"; }
}
/** Bad input, a duplicate, a deactivated target or a refused placement. `fields` names the inputs (never another account). */
export class OrgInputError extends Error {
  readonly fields: Record<string, string>;
  readonly reason: "invalid_request" | "duplicate" | "inactive";
  constructor(reason: "invalid_request" | "duplicate" | "inactive", message: string, fields: Record<string, string> = {}) {
    super(message); this.name = "OrgInputError"; this.reason = reason; this.fields = fields;
  }
}
/** The write may or may not have happened. Carries the requestId so the same intent can be repeated safely. */
export class OutcomeUnknownError extends Error {
  readonly requestId: string | null;
  constructor(requestId: string | null) {
    super("We could not confirm this change. Reload and check before trying again, or press the button again to repeat the same change.");
    this.name = "OutcomeUnknownError"; this.requestId = requestId;
  }
}
/**
 * An earlier write ended with an unknown outcome and has not been reconciled, so a DIFFERENT change is refused locally
 * (no request is sent) instead of replacing that intent. Reload and check the record first.
 */
export class UnresolvedIntentError extends Error {
  readonly requestId: string;
  constructor(requestId: string) {
    super("An earlier change to this may or may not have been saved. Reload and check the record before making a different change.");
    this.name = "UnresolvedIntentError"; this.requestId = requestId;
  }
}
export class OrgUnavailableError extends Error {
  constructor(message = "Records are temporarily unavailable. Please try again in a moment.") { super(message); this.name = "OrgUnavailableError"; }
}

export const STALE_MESSAGE = "Someone else just changed this. Reload the page to see the latest, then try again.";
const TIMEOUT_MS = 15_000;
const WRITES: ReadonlySet<string> = new Set(["client-create", "client-update", "client-deactivate", "outlet-create", "outlet-update", "outlet-deactivate", "staff-create", "staff-update", "staff-correct-email", "placement-assign"]);

type Wire = { ok: true; value: unknown } | { ok: false; error: { code?: string; message?: string; fields?: Record<string, string>; requestId?: string } };

/** Counts reads as they start, so only a read that began AFTER an unknown outcome can reconcile it. */
let readSeq = 0;
const intentSets = new Set<{ confirmRead(action: string, startedAfter: number): void }>();

export async function orgCall<T>(action: OrgAction, body: Record<string, unknown>, fetcher: typeof fetch = fetch): Promise<T> {
  const write = WRITES.has(action);
  const startedRead = write ? 0 : ++readSeq;
  const requestId = typeof body.requestId === "string" ? body.requestId : null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  let wire: Wire | null = null;
  try {
    response = await fetcher(`/api/admin/org-records/${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal, cache: "no-store",
    });
    try { wire = (await response.json()) as Wire; } catch { wire = null; }
  } catch {
    // Timeout or network failure: a write may have been committed.
    throw write ? new OutcomeUnknownError(requestId) : new OrgUnavailableError("We could not load this. Please try again.");
  } finally {
    clearTimeout(timer);
  }
  if (wire && wire.ok === true && response.ok) {
    // A successful read after the unknown outcome is the definite reconciliation: the screen now shows server truth.
    if (!write) intentSets.forEach((k) => k.confirmRead(action, startedRead));
    return wire.value as T;
  }
  if (!wire || typeof wire !== "object" || wire.ok !== false || !wire.error || typeof wire.error.code !== "string") {
    // Unreadable reply: for a write this is "unknown", never "failed".
    throw write ? new OutcomeUnknownError(requestId) : new OrgUnavailableError("We could not load this. Please try again.");
  }
  const { code, message, fields } = wire.error;
  switch (code) {
    case "forbidden": throw new RestrictedError();
    case "not_found": throw new OrgNotFoundError();
    case "stale": throw new ConflictError(STALE_MESSAGE);
    case "invalid_request": throw new OrgInputError("invalid_request", message || "Check the details and try again.", fields);
    case "duplicate": throw new OrgInputError("duplicate", message || "That value is already in use.", fields);
    case "inactive": throw new OrgInputError("inactive", message || "This record has been deactivated.", fields);
    case "outcome_unknown": throw new OutcomeUnknownError(wire.error.requestId ?? requestId);
    case "rate_limited": throw new OrgUnavailableError("Too many requests. Please wait a few minutes and try again.");
    case "unauthenticated": throw new OrgUnavailableError("Your session has ended. Sign in again to continue.");
    case "conflict": throw new OrgUnavailableError("That request clashed with an earlier one. Reload the page and try again.");
    default: throw new OrgUnavailableError();
  }
}

/** Reads treat not-found as "no such record". Everything else still throws. */
export async function orgRead<T>(action: OrgAction, body: Record<string, unknown>, fetcher?: typeof fetch): Promise<T | null> {
  try { return await orgCall<T>(action, body, fetcher); } catch (error) { if (error instanceof OrgNotFoundError) return null; throw error; }
}

export type IntentKeys = ReturnType<typeof createIntentKeys>;

/**
 * One requestId per user intent.
 * - The same id is reused while the previous attempt at the SAME payload is unresolved (unknown outcome).
 * - After an unknown outcome the pending intent is RETAINED: a changed payload is refused (UnresolvedIntentError), never given a
 *   new id, because the first write may already be committed. It is released only by a definite reconciliation: a successful
 *   read of one of `reconcilingReads` that started after the unknown outcome, an explicit `reconcile()`, or a page reload
 *   (state is per page load).
 * - Any definite answer to the write itself (success or refusal) clears it, so the next intent gets a new id.
 */
export function createIntentKeys(newId: () => string = () => crypto.randomUUID(), reconcilingReads: readonly string[] = []) {
  let pending: { signature: string; id: string; unknownAfter: number | null } | null = null;
  const api = {
    begin(payload: unknown): string {
      const signature = JSON.stringify(payload);
      if (pending) {
        if (pending.signature === signature) return pending.id;
        throw new UnresolvedIntentError(pending.id);
      }
      pending = { signature, id: newId(), unknownAfter: null };
      return pending.id;
    },
    settle(error: unknown | null): void {
      if (error instanceof OutcomeUnknownError) { if (pending) pending.unknownAfter = readSeq; return; }
      pending = null;
    },
    /** Explicit definite reconciliation (the caller has read the record and confirmed what happened). */
    reconcile(): void { pending = null; },
    unresolved(): boolean { return pending !== null && pending.unknownAfter !== null; },
    confirmRead(action: string, startedAfter: number): void {
      if (pending && pending.unknownAfter !== null && startedAfter > pending.unknownAfter && reconcilingReads.includes(action)) pending = null;
    },
  };
  intentSets.add(api);
  return api;
}

/** Runs one write under an intent key (one requestId per intent; see createIntentKeys). Never retries by itself. */
export async function orgIntentCall<T>(keys: IntentKeys, action: OrgAction, payload: Record<string, unknown>, fetcher?: typeof fetch): Promise<T> {
  const requestId = keys.begin(payload);
  try {
    const value = await orgCall<T>(action, { requestId, ...payload }, fetcher);
    keys.settle(null);
    return value;
  } catch (error) {
    keys.settle(error);
    throw error;
  }
}

const FIELD_HELP: Record<string, string> = {
  activeStaff: "Someone is still placed here. Move their placement first, then deactivate.",
  effectiveDate: "Choose a start date that is today or earlier and not before the person's current placement began.",
  outletId: "Choose an outlet you can place staff in that is different from the current placement.",
  role: "Choose a role.",
};

/** Plain text for a screen. Field messages are the server's; they never name another account. */
export function orgErrorMessage(error: unknown, fallback = "That could not be saved. Nothing was changed."): string {
  if (error instanceof RestrictedError) return "You do not have access to do that.";
  if (error instanceof OrgInputError) {
    if (error.reason === "duplicate") {
      const f = Object.keys(error.fields);
      const what = f.map((k) => (k === "email" ? "email address" : k === "phone" ? "phone number" : k === "name" ? "name" : k)).join(" and ");
      return `A record with this ${what || "value"} already exists. Check it is not a duplicate before adding it again.`;
    }
    // The server names only the field ("Check this field."). These names are the ones the SQL refuses on purpose
    // (docs/contracts/org-records-wire.md); say what to do in plain words. Anything else keeps the server's message.
    const known = Object.keys(error.fields).filter((k) => Object.hasOwn(FIELD_HELP, k)).map((k) => FIELD_HELP[k]);
    return known.length ? known.join(" ") : error.message;
  }
  if (error instanceof ConflictError || error instanceof OutcomeUnknownError || error instanceof UnresolvedIntentError || error instanceof OrgUnavailableError || error instanceof OrgNotFoundError) return error.message;
  return fallback;
}
