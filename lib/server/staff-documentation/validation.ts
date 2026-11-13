/**
 * Strict command validation. Exact key sets (an unknown key, including any person id, owner, path, bucket or status, is refused).
 * Names and bytes are metadata preflight only: the database re-checks, and stored bytes are verified by the scanner.
 */
import {
  DECISIONS, MAX_DOC_BYTES, OPEN_REASONS, REASON_CODES, STAFF_DOC_SLOTS,
  type CompleteCommand, type CompletionCommand, type DecideCommand, type OpenCommand, type QueueQuery, type SlotKey, type SlotRequestCommand, type SlotState, type StatusCommand,
} from "./types";

export type Checked<T> = { ok: true; value: T } | { ok: false; fields: Record<string, string> };
export const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const STATES: readonly SlotState[] = ["requested", "checking", "available", "verified", "update-required", "rejected", "expired"];
const MIME = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/;

export function plain(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
}
const bad = (...keys: string[]): { ok: false; fields: Record<string, string> } => ({ ok: false, fields: Object.fromEntries(keys.map((k) => [k, "Check this value."])) });
function exact(raw: unknown, keys: readonly string[], optional: readonly string[] = []): raw is Record<string, unknown> {
  if (!plain(raw)) return false;
  const have = Object.keys(raw);
  return have.every((k) => keys.includes(k) || optional.includes(k)) && keys.every((k) => Object.hasOwn(raw, k));
}
const uuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
/** Clean text: trimmed, bounded, no control or format characters. */
const CTRL = /[\u0000-\u001f\u007f-\u009f\p{Cf}]/u;
function cleanText(v: unknown, min: number, max: number): string | null {
  if (typeof v !== "string" || v.length > max * 4 || CTRL.test(v)) return null;
  const t = v.normalize("NFC").trim();
  return t.length >= min && t.length <= max && t === v ? t : null;
}

export function validateEmpty(raw: unknown): Checked<Record<string, never>> {
  return plain(raw) && Object.keys(raw).length === 0 ? { ok: true, value: {} } : bad("request");
}

export function validateSlotRequest(raw: unknown): Checked<SlotRequestCommand> {
  if (!exact(raw, ["requestId", "slot", "fileName", "size", "contentType"])) return bad("request");
  const fields: string[] = [];
  const requestId = typeof raw.requestId === "string" ? raw.requestId.toLowerCase() : "";
  if (!UUID.test(requestId)) fields.push("requestId");
  const def = STAFF_DOC_SLOTS.find((s) => s.slot === raw.slot);
  if (!def) fields.push("slot");
  const name = typeof raw.fileName === "string" ? raw.fileName : "";
  const fileName = name.length <= 1024 && !CTRL.test(name) ? name.normalize("NFC").trim() : "";
  if (!fileName || new TextEncoder().encode(fileName).byteLength > 255 || /[/\\:]/.test(fileName) || fileName.includes("..") || fileName.startsWith(".") || fileName.endsWith(".")) fields.push("fileName");
  const dot = fileName.lastIndexOf(".");
  const extension = dot > 0 ? fileName.slice(dot).toLowerCase() : "";
  if (dot <= 0 || !fileName.slice(0, dot).trim() || !/^\.[a-z0-9]{1,12}$/.test(extension)) fields.push("fileName");
  const size = raw.size;
  if (!Number.isSafeInteger(size) || (size as number) < 1 || (size as number) > MAX_DOC_BYTES) fields.push("size");
  const ct = typeof raw.contentType === "string" && raw.contentType.length <= 255 && !CTRL.test(raw.contentType) ? raw.contentType.trim().toLowerCase() : "";
  if (!MIME.test(ct)) fields.push("contentType");
  if (def && !def.types.some((t) => t.extension === extension && t.mime === ct)) fields.push("fileName", "contentType");
  if (fields.length) return bad(...new Set(fields));
  return { ok: true, value: { requestId, slot: (def as { slot: SlotKey }).slot, fileName, size: size as number, contentType: ct } };
}

export function validateComplete(raw: unknown): Checked<CompleteCommand> {
  if (!exact(raw, ["requestId", "uploadId"]) || !uuid(raw.requestId) || !uuid(raw.uploadId)) return bad("request");
  return { ok: true, value: { requestId: raw.requestId.toLowerCase(), uploadId: raw.uploadId.toLowerCase() } };
}
export function validateStatus(raw: unknown): Checked<StatusCommand> {
  if (!exact(raw, ["uploadId"]) || !uuid(raw.uploadId)) return bad("request");
  return { ok: true, value: { uploadId: raw.uploadId.toLowerCase() } };
}

export function validateQueue(raw: unknown): Checked<QueueQuery> {
  if (!exact(raw, [], ["state", "slot", "clientId", "search", "page", "pageSize"])) return bad("request");
  const state = raw.state ?? "", slot = raw.slot ?? "", clientId = raw.clientId ?? "", search = raw.search ?? "", page = raw.page ?? 1, pageSize = raw.pageSize ?? 20;
  const fields: string[] = [];
  if (typeof state !== "string" || (state !== "" && !STATES.includes(state as SlotState))) fields.push("state");
  if (typeof slot !== "string" || (slot !== "" && !STAFF_DOC_SLOTS.some((s) => s.slot === slot))) fields.push("slot");
  if (typeof clientId !== "string" || (clientId !== "" && !UUID.test(clientId))) fields.push("clientId");
  if (typeof search !== "string" || search.length > 80 || CTRL.test(search)) fields.push("search");
  if (!Number.isSafeInteger(page) || (page as number) < 1 || (page as number) > 9999) fields.push("page");
  if (!Number.isSafeInteger(pageSize) || (pageSize as number) < 1 || (pageSize as number) > 50) fields.push("pageSize");
  if (fields.length) return bad(...fields);
  return { ok: true, value: { state: state as QueueQuery["state"], slot: slot as QueueQuery["slot"], clientId: (clientId as string).toLowerCase(), search: (search as string).trim(), page: page as number, pageSize: pageSize as number } };
}

export function validateOpen(raw: unknown): Checked<OpenCommand> {
  if (!exact(raw, ["versionId", "reason"]) || !uuid(raw.versionId) || typeof raw.reason !== "string" || !(OPEN_REASONS as readonly string[]).includes(raw.reason)) return bad("request");
  return { ok: true, value: { versionId: raw.versionId.toLowerCase(), reason: raw.reason as OpenCommand["reason"] } };
}

export function validateDecide(raw: unknown): Checked<DecideCommand> {
  if (!exact(raw, ["requestId", "versionId", "decision", "expectedSeq"], ["reasonCode", "message", "expiresOn"])) return bad("request");
  const fields: string[] = [];
  if (!uuid(raw.requestId)) fields.push("requestId");
  if (!uuid(raw.versionId)) fields.push("versionId");
  const decision = raw.decision;
  if (typeof decision !== "string" || !(DECISIONS as readonly string[]).includes(decision)) fields.push("decision");
  if (!Number.isSafeInteger(raw.expectedSeq) || (raw.expectedSeq as number) < 0 || (raw.expectedSeq as number) > 100000) fields.push("expectedSeq");
  const reasonCode = raw.reasonCode ?? null, rawMessage = raw.message ?? null, expiresOn = raw.expiresOn ?? null;
  let message: string | null = null;
  if (decision === "verified") {
    if (reasonCode !== null) fields.push("reasonCode");
    if (rawMessage !== null) fields.push("message");
    if (expiresOn !== null && (typeof expiresOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn))) fields.push("expiresOn");
  } else if (decision === "update_required" || decision === "rejected") {
    if (typeof reasonCode !== "string" || !(REASON_CODES as readonly string[]).includes(reasonCode)) fields.push("reasonCode");
    message = cleanText(rawMessage, 3, 300);
    if (message === null) fields.push("message");
    if (expiresOn !== null) fields.push("expiresOn");
  }
  if (fields.length) return bad(...new Set(fields));
  return {
    ok: true,
    value: {
      requestId: (raw.requestId as string).toLowerCase(), versionId: (raw.versionId as string).toLowerCase(), decision: decision as DecideCommand["decision"],
      reasonCode: decision === "verified" ? null : (reasonCode as DecideCommand["reasonCode"]), message, expiresOn: decision === "verified" ? (expiresOn as string | null) : null,
      expectedSeq: raw.expectedSeq as number,
    },
  };
}

export function validateCompletion(raw: unknown): Checked<CompletionCommand> {
  if (!exact(raw, ["personIds"]) || !Array.isArray(raw.personIds) || raw.personIds.length < 1 || raw.personIds.length > 50 || !raw.personIds.every(uuid)) return bad("personIds");
  return { ok: true, value: { personIds: [...new Set((raw.personIds as string[]).map((x) => x.toLowerCase()))] } };
}
