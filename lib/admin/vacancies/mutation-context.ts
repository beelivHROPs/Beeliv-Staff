/** Keeps one vacancy command and request ID across an uncertain write. No network or storage. */
import type { VacancyWriteClientResult } from "./write-client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTENTS = ["save", "submit-for-approval", "publish"];
const ACTIONS = ["submit-for-approval", "publish", "resume", "pause", "close", "mark-filled", "cancel"];
type VacancyMutationDraft =
  | { kind: "create" | "update"; input: unknown; intent: "save" | "submit-for-approval" | "publish" }
  | { kind: "action"; action: string; reason?: string };
export type DisplayedVacancyRevision = { id: string; revision: number };
export type VacancyMutationCommand =
  | { kind: "create"; requestId: string; input: unknown; intent: string }
  | { kind: "update"; requestId: string; id: string; expectedRevision: number; input: unknown; intent: string }
  | { kind: "action"; requestId: string; id: string; expectedRevision: number; action: string; reason?: string };
export type MutationBegin =
  | { ok: true; command: VacancyMutationCommand; reused: boolean }
  | { ok: false; reason: "invalid" | "pending" | "uncertain" | "changed_command" | "no_pending"; requestId?: string };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function validRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 2147483646;
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (record(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function envelope(draft: unknown, displayed: DisplayedVacancyRevision | null, requestId: string): { command: VacancyMutationCommand; fingerprint: string } | null {
  if (!record(draft) || !UUID.test(requestId)) return null;
  const kind = draft.kind;
  if (kind !== "create" && kind !== "update" && kind !== "action") return null;
  const keys = kind === "action" ? ["kind", "action", "reason"] : ["kind", "input", "intent"];
  if (Object.keys(draft).some(key => !keys.includes(key))) return null;
  if (kind === "create" ? displayed !== null : !record(displayed) || typeof displayed.id !== "string" || !UUID.test(displayed.id) || !validRevision(displayed.revision)) return null;
  let raw: VacancyMutationCommand;
  const id = requestId.toLowerCase();
  if (kind === "action") {
    if (typeof draft.action !== "string" || !ACTIONS.includes(draft.action) || (draft.reason !== undefined && typeof draft.reason !== "string")) return null;
    raw = { kind, requestId: id, id: displayed!.id.toLowerCase(), expectedRevision: displayed!.revision, action: draft.action, ...(draft.reason === undefined ? {} : { reason: draft.reason }) };
  } else {
    if (!Object.hasOwn(draft, "input") || typeof draft.intent !== "string" || !INTENTS.includes(draft.intent)) return null;
    raw = kind === "create"
      ? { kind, requestId: id, input: draft.input, intent: draft.intent }
      : { kind, requestId: id, id: displayed!.id.toLowerCase(), expectedRevision: displayed!.revision, input: draft.input, intent: draft.intent };
  }
  try {
    const fingerprint = JSON.stringify(canonical(raw));
    const command: unknown = JSON.parse(fingerprint);
    if (!record(command) || command.requestId !== id || command.kind !== kind) return null;
    if (kind !== "action" && !Object.hasOwn(command, "input")) return null;
    return { command: command as VacancyMutationCommand, fingerprint };
  } catch { return null; }
}

export function createVacancyMutationContext() {
  let held: { fingerprint: string; command: VacancyMutationCommand; phase: "pending" | "uncertain" } | null = null;
  const copy = (command: VacancyMutationCommand): VacancyMutationCommand => JSON.parse(JSON.stringify(command)) as VacancyMutationCommand;
  return {
    current(): { phase: "idle" | "pending" | "uncertain"; requestId?: string } {
      return held ? { phase: held.phase, requestId: held.command.requestId } : { phase: "idle" };
    },
    /** Initial attempt requires a caller-owned UUID. A pending or uncertain command is never replaced here. */
    start(draft: VacancyMutationDraft, displayed: DisplayedVacancyRevision | null, requestId: string): MutationBegin {
      const next = envelope(draft, displayed, requestId);
      if (!next) return { ok: false, reason: "invalid" };
      if (held) {
        const same = envelope(draft, displayed, held.command.requestId)?.fingerprint === held.fingerprint;
        return { ok: false, reason: same ? held.phase : "changed_command", requestId: held.command.requestId };
      }
      held = { ...next, phase: "pending" };
      return { ok: true, command: copy(next.command), reused: false };
    },
    /** Only an explicit retry of the identical uncertain command may send again. */
    retry(draft: VacancyMutationDraft, displayed: DisplayedVacancyRevision | null): MutationBegin {
      if (!held) return { ok: false, reason: "no_pending" };
      const next = envelope(draft, displayed, held.command.requestId);
      if (!next || next.fingerprint !== held.fingerprint) return { ok: false, reason: "changed_command", requestId: held.command.requestId };
      if (held.phase === "pending") return { ok: false, reason: "pending", requestId: held.command.requestId };
      held.phase = "pending";
      return { ok: true, command: copy(held.command), reused: true };
    },
    /** Ignore late results from a command that was reset or superseded. */
    settle(requestId: string, result: VacancyWriteClientResult): boolean {
      if (!held || held.phase !== "pending" || requestId.toLowerCase() !== held.command.requestId) return false;
      if (!result.ok && result.code === "outcome_unknown") held.phase = "uncertain";
      else held = null;
      return true;
    },
    /** Explicitly abandon an uncertain command after the UI has reconciled the server record. */
    dismiss(): boolean {
      if (!held || held.phase !== "uncertain") return false;
      held = null;
      return true;
    },
    /** A pending fetch cannot be abandoned to permit a different write. */
    reset(): boolean {
      if (held?.phase === "pending") return false;
      held = null;
      return true;
    },
  };
}
