/**
 * DTO projection. Every reply is REBUILT from an explicit allow-list of fields, so an unexpected key from the database
 * (a path, bucket, scan report, note, digest) cannot reach a browser. A malformed value fails closed (null).
 * Slot labels and sensitivity come from the service's own table, never from the reply. Whether a slot is ENABLED is the database's decision.
 */
import { plain, UUID } from "./validation";
import {
  REASON_CODES, STAFF_DOC_SLOTS,
  type ClientCompletionDto, type ClientStatus, type CurrentDto, type HrCompletionDto, type HrCurrentDto, type HrQueueDto, type HrQueueRowDto, type HrSlotDto,
  type IncomingDto, type IncomingStatus, type OwnChecklistDto, type OwnSlotDto, type ReasonCode, type ReviewState, type SlotKey, type SlotState, type SummaryDto, type UploadStatusDto,
} from "./types";

const STATES: readonly SlotState[] = ["requested", "checking", "available", "verified", "update-required", "rejected", "expired"];
const REVIEWS: readonly ReviewState[] = ["not-reviewed", "verified", "update-required", "rejected"];
const INCOMING: readonly IncomingStatus[] = ["awaiting-bytes", "checking", "refused", "unavailable"];
const CLIENT: readonly ClientStatus[] = ["missing", "in-review", "verified", "needs-attention"];
const UPLOAD: readonly UploadStatusDto["status"][] = ["awaiting-bytes", "checking", "available", "rejected", "expired", "unavailable"];
const ISO = /^\d{4}-\d{2}-\d{2}T[0-9:.]+(Z|[+-]\d{2}(:?\d{2})?)$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const slotOf = (v: unknown) => STAFF_DOC_SLOTS.find((s) => s.slot === v);
const when = (v: unknown): string | null | undefined => (v === null ? null : typeof v === "string" && v.length <= 40 && ISO.test(v) ? v : undefined);
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | null => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null);

function current(raw: unknown): CurrentDto | null | undefined {
  if (raw === null) return null;
  if (!plain(raw)) return undefined;
  const review = oneOf(raw.review, REVIEWS), reviewedAt = when(raw.reviewedAt), uploadedAt = when(raw.uploadedAt);
  const code = raw.reasonCode === null ? null : oneOf<ReasonCode>(raw.reasonCode, REASON_CODES);
  const message = raw.message === null ? null : typeof raw.message === "string" && raw.message.length <= 300 ? raw.message : undefined;
  const expiresOn = raw.expiresOn === null ? null : typeof raw.expiresOn === "string" && DAY.test(raw.expiresOn) ? raw.expiresOn : undefined;
  if (!review || reviewedAt === undefined || !uploadedAt || (raw.reasonCode !== null && code === null) || message === undefined || expiresOn === undefined) return undefined;
  if (!Number.isSafeInteger(raw.version) || (raw.version as number) < 1) return undefined;
  // A reason is only ever present for a decision that asked for an update or rejected.
  const decided = review === "update-required" || review === "rejected";
  if ((code !== null) !== decided || (message !== null) !== decided) return undefined;
  return { version: raw.version as number, review, reviewedAt, reasonCode: code, message, expiresOn, uploadedAt };
}
function hrCurrent(raw: unknown): HrCurrentDto | null | undefined {
  const base = current(raw);
  if (base === null || base === undefined) return base;
  const r = raw as Record<string, unknown>;
  if (!isId(r.versionId) || !Number.isSafeInteger(r.decisionSeq) || (r.decisionSeq as number) < 0) return undefined;
  return { ...base, versionId: r.versionId.toLowerCase(), decisionSeq: r.decisionSeq as number };
}
function incoming(raw: unknown): IncomingDto | null | undefined {
  if (raw === null) return null;
  if (!plain(raw)) return undefined;
  const status = oneOf(raw.status, INCOMING);
  return isId(raw.uploadId) && status ? { uploadId: raw.uploadId.toLowerCase(), status } : undefined;
}
export function projectSummary(raw: unknown): SummaryDto | null {
  if (!plain(raw) || !Number.isSafeInteger(raw.counted) || !Number.isSafeInteger(raw.verified) || typeof raw.complete !== "boolean") return null;
  const counted = raw.counted as number, verified = raw.verified as number;
  if (counted < 0 || verified < 0 || verified > counted || raw.complete !== (counted > 0 && verified === counted)) return null;
  return { counted, verified, complete: raw.complete };
}
function slotCore(raw: unknown) {
  if (!plain(raw)) return null;
  const def = slotOf(raw.slot), state = oneOf(raw.state, STATES), inc = incoming(raw.incoming);
  if (!def || !state || inc === undefined) return null;
  if ((raw.sensitive !== undefined && raw.sensitive !== (def.sensitivity === "sensitive")) || (raw.counts !== undefined && raw.counts !== def.counts)) return null;
  return { def, state, inc };
}
export function projectOwnSlot(raw: unknown): OwnSlotDto | null {
  const core = slotCore(raw);
  if (!core) return null;
  const cur = current((raw as Record<string, unknown>).current);
  if (cur === undefined) return null;
  return { slot: core.def.slot, label: core.def.label, sensitive: core.def.sensitivity === "sensitive", counts: core.def.counts, state: core.state, current: cur, incoming: core.inc };
}
function hrSlot(raw: unknown): HrSlotDto | null {
  const core = slotCore(raw);
  if (!core) return null;
  const cur = hrCurrent((raw as Record<string, unknown>).current);
  if (cur === undefined) return null;
  return { slot: core.def.slot, label: core.def.label, sensitive: core.def.sensitivity === "sensitive", counts: core.def.counts, state: core.state, current: cur, incoming: core.inc };
}
export function projectChecklist(data: Record<string, unknown>): OwnChecklistDto | null {
  if (!Array.isArray(data.items) || data.items.length > STAFF_DOC_SLOTS.length) return null;
  const items = data.items.map(projectOwnSlot);
  const summary = projectSummary(data.summary);
  return items.every((x): x is OwnSlotDto => x !== null) && summary ? { items: items as OwnSlotDto[], summary } : null;
}
const text = (v: unknown, max: number): string | null => (typeof v === "string" && v.length <= max && !/[\u0000-\u001f\u007f-\u009f]/.test(v) ? v : null);
export function projectQueue(data: Record<string, unknown>, pageSize: number): HrQueueDto | null {
  if (!Array.isArray(data.items) || data.items.length > pageSize || !Number.isSafeInteger(data.total) || !Number.isSafeInteger(data.page) || data.pageSize !== pageSize) return null;
  const items: HrQueueRowDto[] = [];
  for (const raw of data.items) {
    if (!plain(raw) || !isId(raw.personId) || typeof raw.canOpen !== "boolean" || typeof raw.canDecide !== "boolean") return null;
    const name = text(raw.name, 200), reference = text(raw.reference, 60), slot = hrSlot(raw);
    if (name === null || reference === null || !slot) return null;
    items.push({ personId: raw.personId.toLowerCase(), name, reference, slot: slot.slot, label: slot.label, sensitive: slot.sensitive, state: slot.state, current: slot.current, incoming: slot.incoming, canOpen: raw.canOpen, canDecide: raw.canDecide });
  }
  return { items, total: data.total as number, page: data.page as number, pageSize };
}
export function projectHrCompletion(data: Record<string, unknown>): HrCompletionDto | null {
  if (!Array.isArray(data.people) || data.people.length > 50) return null;
  const people: HrCompletionDto["people"] = [];
  for (const p of data.people) {
    if (!plain(p) || !isId(p.personId) || !Array.isArray(p.items)) return null;
    const items = p.items.map(hrSlot), summary = projectSummary(p.summary);
    if (!items.every((x): x is HrSlotDto => x !== null) || !summary) return null;
    people.push({ personId: p.personId.toLowerCase(), items: items as HrSlotDto[], summary });
  }
  return { people };
}
export function projectClientCompletion(data: Record<string, unknown>): ClientCompletionDto | null {
  if (!Array.isArray(data.people) || data.people.length > 50) return null;
  const people: ClientCompletionDto["people"] = [];
  for (const p of data.people) {
    if (!plain(p) || !isId(p.personId) || !Array.isArray(p.items) || typeof p.complete !== "boolean") return null;
    const items: { slot: SlotKey; label: string; status: ClientStatus }[] = [];
    for (const i of p.items) {
      const def = plain(i) ? slotOf(i.slot) : undefined, status = plain(i) ? oneOf(i.status, CLIENT) : null;
      // A sensitive slot must never reach a Client, whatever the database says.
      if (!def || def.sensitivity !== "ordinary" || !status) return null;
      items.push({ slot: def.slot, label: def.label, status });
    }
    if (p.complete !== (items.length > 0 && items.every((x) => x.status === "verified"))) return null;
    people.push({ personId: p.personId.toLowerCase(), items, complete: p.complete });
  }
  return { people };
}
export function projectUploadStatus(data: Record<string, unknown>, uploadId: string): UploadStatusDto | null {
  const status = oneOf(data.status, UPLOAD);
  return data.uploadId === uploadId && status ? { uploadId, status } : null;
}
