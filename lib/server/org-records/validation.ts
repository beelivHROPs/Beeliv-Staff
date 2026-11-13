/** Pure, bounded validators. The database repeats the structural checks; these are the first gate. */
import {
  CLIENT_OUTLETS_DEFAULT, CLIENT_OUTLETS_MAX, STAFF_HISTORY_DEFAULT, STAFF_HISTORY_MAX, type ClientGetQuery, type StaffGetQuery,
  ORG_STATUSES, STAFF_SHOWS, STAFF_STATUSES,
  type ClientCreateCommand, type ClientDeactivateCommand, type ClientListQuery, type ClientPatch, type ClientUpdateCommand,
  type OutletCreateCommand, type OutletDeactivateCommand, type OutletPatch, type OutletUpdateCommand,
  type PlacementAssignCommand, type PlacementInput, type StaffCorrectEmailCommand, type StaffCreateCommand, type StaffListQuery, type StaffPatch, type StaffUpdateCommand,
} from "./types";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Proposed limits, not approved product rules. */
export const LIMITS = { name: 200, staffName: 200, short: 120, address: 300, phone: 40, email: 254, notes: 500, reason: 300, note: 300, search: 80, role: 80 } as const;
export type Checked<T> = { ok: true; value: T } | { ok: false; fields: Record<string, string> };

export function plain(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
const bad = (fields: Record<string, string>): { ok: false; fields: Record<string, string> } => ({ ok: false, fields });
const INVALID = bad({ input: "Invalid request." });

/** Sensitive data is out of this slice: such a key is refused outright, before any other check. */
const SENSITIVE_KEY = /^(nin|bvn|national_?id|bank.*|account.*|iban|medical.*|health.*|passport.*|next_?of_?kin.*|nok.*|home_?address|salary.*)$/i;
function hasSensitiveKey(raw: Record<string, unknown>): boolean {
  return Object.keys(raw).some((key) => SENSITIVE_KEY.test(key));
}
/** Exact key set (required plus optional). Rejects extras so the browser cannot smuggle ids, status or references. */
function shape(raw: unknown, required: readonly string[], optional: readonly string[] = []): raw is Record<string, unknown> {
  if (!plain(raw) || hasSensitiveKey(raw)) return false;
  const present = Object.keys(raw);
  return present.every((k) => required.includes(k) || optional.includes(k)) && required.every((k) => present.includes(k));
}
const uuid = (v: unknown): string | null => (typeof v === "string" && UUID.test(v) ? v.toLowerCase() : null);
const revision = (v: unknown): number | null => (Number.isSafeInteger(v) && (v as number) >= 1 && (v as number) <= 1_000_000 ? (v as number) : null);

/** Trimmed, bounded, no control characters (newline allowed only when `multiline`). Inner whitespace of single-line text is collapsed. */
function text(value: unknown, min: number, max: number, multiline = false): string | null {
  if (typeof value !== "string" || value.length > max * 2) return null;
  let clean = value.trim();
  if (!multiline) clean = clean.replace(/\s+/g, " ");
  const control = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/;
  return clean.length >= min && clean.length <= max && !control.test(clean) ? clean : null;
}
/** Canonical international phone (same rule as auth_people.phone) or empty. Syntax only: it proves nothing about ownership. */
function phone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean === "" || /^\+[1-9][0-9]{6,14}$/.test(clean) ? clean : null;
}
function email(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().toLowerCase();
  return clean.length >= 3 && clean.length <= LIMITS.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) && !/[\u0000-\u001f\u007f]/.test(clean) ? clean : null;
}
/** A real calendar date, yyyy-mm-dd. */
function isoDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value && value >= "2000-01-01" && value <= "2100-12-31" ? value : null;
}

/** Collects field errors for a set of optional-or-required text fields. */
function collect(fields: Record<string, string>, key: string, value: string | null, message = "Check this field."): value is string {
  if (value === null) fields[key] = message;
  return value !== null;
}

/* ---------------------------------- clients ---------------------------------- */

export function validateClientCreate(raw: unknown): Checked<ClientCreateCommand> {
  if (!shape(raw, ["requestId", "name", "businessType", "city", "address"])) return INVALID;
  const f: Record<string, string> = {};
  const requestId = uuid(raw.requestId); if (!requestId) f.requestId = "Invalid.";
  const name = text(raw.name, 2, LIMITS.name), businessType = text(raw.businessType, 1, LIMITS.short), city = text(raw.city, 1, LIMITS.short), address = text(raw.address, 0, LIMITS.address);
  collect(f, "name", name, "Enter a client name (2 to 200 characters)."); collect(f, "businessType", businessType); collect(f, "city", city); collect(f, "address", address);
  return Object.keys(f).length ? bad(f) : { ok: true, value: { requestId: requestId!, name: name!, businessType: businessType!, city: city!, address: address! } };
}
function clientPatch(raw: unknown): Checked<ClientPatch> {
  if (!shape(raw, [], ["name", "businessType", "city", "address"]) || Object.keys(raw).length === 0) return bad({ patch: "Change at least one field." });
  const f: Record<string, string> = {}, out: ClientPatch = {};
  if ("name" in raw) { const v = text(raw.name, 2, LIMITS.name); if (collect(f, "name", v)) out.name = v; }
  if ("businessType" in raw) { const v = text(raw.businessType, 1, LIMITS.short); if (collect(f, "businessType", v)) out.businessType = v; }
  if ("city" in raw) { const v = text(raw.city, 1, LIMITS.short); if (collect(f, "city", v)) out.city = v; }
  if ("address" in raw) { const v = text(raw.address, 0, LIMITS.address); if (collect(f, "address", v)) out.address = v; }
  return Object.keys(f).length ? bad(f) : { ok: true, value: out };
}
export function validateClientUpdate(raw: unknown): Checked<ClientUpdateCommand> {
  if (!shape(raw, ["requestId", "clientId", "expectedRevision", "patch"])) return INVALID;
  const requestId = uuid(raw.requestId), clientId = uuid(raw.clientId), expectedRevision = revision(raw.expectedRevision);
  if (!requestId || !clientId || expectedRevision === null) return INVALID;
  const patch = clientPatch(raw.patch); if (!patch.ok) return patch;
  return { ok: true, value: { requestId, clientId, expectedRevision, patch: patch.value } };
}
export function validateClientDeactivate(raw: unknown): Checked<ClientDeactivateCommand> {
  if (!shape(raw, ["requestId", "clientId", "expectedRevision", "reason"])) return INVALID;
  const requestId = uuid(raw.requestId), clientId = uuid(raw.clientId), expectedRevision = revision(raw.expectedRevision), reason = text(raw.reason, 3, LIMITS.reason);
  if (!requestId || !clientId || expectedRevision === null) return INVALID;
  return reason ? { ok: true, value: { requestId, clientId, expectedRevision, reason } } : bad({ reason: "Give a reason (3 to 300 characters)." });
}

/* ---------------------------------- outlets ---------------------------------- */

export function validateOutletCreate(raw: unknown): Checked<OutletCreateCommand> {
  if (!shape(raw, ["requestId", "clientId", "name", "address", "city"], ["phone", "manager", "notes"])) return INVALID;
  const f: Record<string, string> = {};
  const requestId = uuid(raw.requestId), clientId = uuid(raw.clientId);
  if (!requestId || !clientId) return INVALID;
  const name = text(raw.name, 1, LIMITS.name), address = text(raw.address, 0, LIMITS.address), city = text(raw.city, 1, LIMITS.short);
  const ph = phone(raw.phone ?? ""), manager = text(raw.manager ?? "", 0, LIMITS.short), notes = text(raw.notes ?? "", 0, LIMITS.notes, true);
  collect(f, "name", name, "Enter an outlet name."); collect(f, "address", address); collect(f, "city", city);
  collect(f, "phone", ph, "Use the international format, e.g. +2348012345678."); collect(f, "manager", manager); collect(f, "notes", notes);
  return Object.keys(f).length ? bad(f) : { ok: true, value: { requestId, clientId, name: name!, address: address!, city: city!, phone: ph!, manager: manager!, notes: notes! } };
}
function outletPatch(raw: unknown): Checked<OutletPatch> {
  if (!shape(raw, [], ["name", "address", "city", "phone", "manager", "notes"]) || Object.keys(raw).length === 0) return bad({ patch: "Change at least one field." });
  const f: Record<string, string> = {}, out: OutletPatch = {};
  if ("name" in raw) { const v = text(raw.name, 1, LIMITS.name); if (collect(f, "name", v)) out.name = v; }
  if ("address" in raw) { const v = text(raw.address, 0, LIMITS.address); if (collect(f, "address", v)) out.address = v; }
  if ("city" in raw) { const v = text(raw.city, 1, LIMITS.short); if (collect(f, "city", v)) out.city = v; }
  if ("phone" in raw) { const v = phone(raw.phone); if (collect(f, "phone", v, "Use the international format, e.g. +2348012345678.")) out.phone = v; }
  if ("manager" in raw) { const v = text(raw.manager, 0, LIMITS.short); if (collect(f, "manager", v)) out.manager = v; }
  if ("notes" in raw) { const v = text(raw.notes, 0, LIMITS.notes, true); if (collect(f, "notes", v)) out.notes = v; }
  return Object.keys(f).length ? bad(f) : { ok: true, value: out };
}
export function validateOutletUpdate(raw: unknown): Checked<OutletUpdateCommand> {
  if (!shape(raw, ["requestId", "clientId", "outletId", "expectedRevision", "patch"])) return INVALID;
  const requestId = uuid(raw.requestId), clientId = uuid(raw.clientId), outletId = uuid(raw.outletId), expectedRevision = revision(raw.expectedRevision);
  if (!requestId || !clientId || !outletId || expectedRevision === null) return INVALID;
  const patch = outletPatch(raw.patch); if (!patch.ok) return patch;
  return { ok: true, value: { requestId, clientId, outletId, expectedRevision, patch: patch.value } };
}
export function validateOutletDeactivate(raw: unknown): Checked<OutletDeactivateCommand> {
  if (!shape(raw, ["requestId", "clientId", "outletId", "expectedRevision", "reason"])) return INVALID;
  const requestId = uuid(raw.requestId), clientId = uuid(raw.clientId), outletId = uuid(raw.outletId), expectedRevision = revision(raw.expectedRevision), reason = text(raw.reason, 3, LIMITS.reason);
  if (!requestId || !clientId || !outletId || expectedRevision === null) return INVALID;
  return reason ? { ok: true, value: { requestId, clientId, outletId, expectedRevision, reason } } : bad({ reason: "Give a reason (3 to 300 characters)." });
}

/* ----------------------------------- staff ----------------------------------- */

function placementInput(raw: unknown): Checked<PlacementInput> {
  if (!shape(raw, ["clientId", "outletId", "role", "startDate"], ["department", "note"])) return bad({ initialPlacement: "Invalid placement." });
  const f: Record<string, string> = {};
  const clientId = uuid(raw.clientId), outletId = uuid(raw.outletId);
  if (!clientId) f.clientId = "Choose a client."; if (!outletId) f.outletId = "Choose an outlet.";
  const role = text(raw.role, 1, LIMITS.role), department = text(raw.department ?? "", 0, LIMITS.role), note = text(raw.note ?? "", 0, LIMITS.note, true), startDate = isoDate(raw.startDate);
  collect(f, "role", role, "Choose a role."); collect(f, "department", department); collect(f, "note", note, "Keep the note under 300 characters."); collect(f, "startDate", startDate, "Choose a valid date.");
  return Object.keys(f).length ? bad(f) : { ok: true, value: { clientId: clientId!, outletId: outletId!, role: role!, department: department!, startDate: startDate!, note: note! } };
}
export function validateStaffCreate(raw: unknown): Checked<StaffCreateCommand> {
  if (!shape(raw, ["requestId", "fullName", "email"], ["phone", "department", "initialPlacement"])) return INVALID;
  const requestId = uuid(raw.requestId); if (!requestId) return INVALID;
  const f: Record<string, string> = {};
  const fullName = text(raw.fullName, 2, LIMITS.staffName), em = email(raw.email), ph = phone(raw.phone ?? ""), department = text(raw.department ?? "", 0, LIMITS.role);
  collect(f, "fullName", fullName, "Enter the full name."); collect(f, "email", em, "Enter a valid email."); collect(f, "phone", ph, "Use the international format, e.g. +2348012345678."); collect(f, "department", department);
  let initialPlacement: PlacementInput | null = null;
  if (raw.initialPlacement !== undefined && raw.initialPlacement !== null) {
    const p = placementInput(raw.initialPlacement);
    if (p.ok) initialPlacement = p.value; else Object.assign(f, p.fields);
  }
  return Object.keys(f).length ? bad(f) : { ok: true, value: { requestId, fullName: fullName!, email: em!, phone: ph!, department: department!, initialPlacement } };
}
function staffPatch(raw: unknown): Checked<StaffPatch> {
  if (!shape(raw, [], ["fullName", "phone", "status", "department"]) || Object.keys(raw).length === 0) return bad({ patch: "Change at least one field." });
  const f: Record<string, string> = {}, out: StaffPatch = {};
  if ("fullName" in raw) { const v = text(raw.fullName, 2, LIMITS.staffName); if (collect(f, "fullName", v)) out.fullName = v; }
  if ("phone" in raw) { const v = phone(raw.phone); if (collect(f, "phone", v, "Use the international format, e.g. +2348012345678.")) out.phone = v; }
  if ("status" in raw) { if (typeof raw.status === "string" && (STAFF_STATUSES as readonly string[]).includes(raw.status)) out.status = raw.status as StaffPatch["status"]; else f.status = "Choose a valid status."; }
  if ("department" in raw) { const v = text(raw.department, 0, LIMITS.role); if (collect(f, "department", v)) out.department = v; }
  return Object.keys(f).length ? bad(f) : { ok: true, value: out };
}
export function validateStaffUpdate(raw: unknown): Checked<StaffUpdateCommand> {
  if (!shape(raw, ["requestId", "staffId", "expectedRevision", "patch"])) return INVALID;
  const requestId = uuid(raw.requestId), staffId = uuid(raw.staffId), expectedRevision = revision(raw.expectedRevision);
  if (!requestId || !staffId || expectedRevision === null) return INVALID;
  const patch = staffPatch(raw.patch); if (!patch.ok) return patch;
  return { ok: true, value: { requestId, staffId, expectedRevision, patch: patch.value } };
}
export function validateStaffCorrectEmail(raw: unknown): Checked<StaffCorrectEmailCommand> {
  if (!shape(raw, ["requestId", "staffId", "expectedRevision", "email"])) return INVALID;
  const requestId = uuid(raw.requestId), staffId = uuid(raw.staffId), expectedRevision = revision(raw.expectedRevision);
  if (!requestId || !staffId || expectedRevision === null) return INVALID;
  const em = email(raw.email);
  if (!em) return bad({ email: "Enter a valid email." });
  return { ok: true, value: { requestId, staffId, expectedRevision, email: em } };
}
export function validatePlacementAssign(raw: unknown): Checked<PlacementAssignCommand> {
  if (!shape(raw, ["requestId", "staffId", "expectedRevision", "clientId", "outletId", "role", "effectiveDate"], ["department", "note"])) return INVALID;
  const requestId = uuid(raw.requestId), staffId = uuid(raw.staffId), expectedRevision = revision(raw.expectedRevision), clientId = uuid(raw.clientId), outletId = uuid(raw.outletId);
  if (!requestId || !staffId || expectedRevision === null) return INVALID;
  const f: Record<string, string> = {};
  if (!clientId) f.clientId = "Choose a client."; if (!outletId) f.outletId = "Choose an outlet.";
  const role = text(raw.role, 1, LIMITS.role), department = text(raw.department ?? "", 0, LIMITS.role), note = text(raw.note ?? "", 0, LIMITS.note, true), effectiveDate = isoDate(raw.effectiveDate);
  collect(f, "role", role, "Choose a role."); collect(f, "department", department); collect(f, "note", note, "Keep the note under 300 characters."); collect(f, "effectiveDate", effectiveDate, "Choose a valid date.");
  return Object.keys(f).length ? bad(f) : { ok: true, value: { requestId, staffId, expectedRevision, clientId: clientId!, outletId: outletId!, role: role!, department: department!, effectiveDate: effectiveDate!, note: note! } };
}

/* ----------------------------------- reads ----------------------------------- */

function paging(raw: Record<string, unknown>): { page: number; pageSize: number } | null {
  const page = raw.page ?? 1, pageSize = raw.pageSize ?? 20;
  return Number.isSafeInteger(page) && (page as number) >= 1 && (page as number) <= 9999 && Number.isSafeInteger(pageSize) && (pageSize as number) >= 1 && (pageSize as number) <= 50
    ? { page: page as number, pageSize: pageSize as number } : null;
}
export function validateClientList(raw: unknown): Checked<ClientListQuery> {
  if (!shape(raw, [], ["search", "status", "page", "pageSize"])) return INVALID;
  const search = text(raw.search ?? "", 0, LIMITS.search), p = paging(raw);
  const status = raw.status ?? "";
  if (search === null || !p || (status !== "" && !(typeof status === "string" && (ORG_STATUSES as readonly string[]).includes(status)))) return bad({ input: "Invalid query." });
  return { ok: true, value: { search, status: status as ClientListQuery["status"], ...p } };
}
export function validateStaffList(raw: unknown): Checked<StaffListQuery> {
  if (!shape(raw, [], ["search", "show", "clientId", "status", "page", "pageSize"])) return INVALID;
  const search = text(raw.search ?? "", 0, LIMITS.search), p = paging(raw);
  const show = raw.show ?? "all", status = raw.status ?? "", clientId = raw.clientId === undefined || raw.clientId === "" ? "" : uuid(raw.clientId);
  if (search === null || !p || clientId === null
    || !(typeof show === "string" && (STAFF_SHOWS as readonly string[]).includes(show))
    || (status !== "" && !(typeof status === "string" && (STAFF_STATUSES as readonly string[]).includes(status)))) return bad({ input: "Invalid query." });
  return { ok: true, value: { search, show: show as StaffListQuery["show"], clientId, status: status as StaffListQuery["status"], ...p } };
}
function bounded(raw: unknown, def: number, max: number): number | null {
  const v = raw === undefined ? def : raw;
  return Number.isSafeInteger(v) && (v as number) >= 1 && (v as number) <= max ? (v as number) : null;
}
const given = (v: unknown) => v !== undefined && v !== null;
/** Client detail: outlets come in bounded pages. `outletsAfter` is an outlet id returned by the previous page. */
export function validateClientGet(raw: unknown): Checked<ClientGetQuery> {
  if (!shape(raw, ["clientId"], ["outletsLimit", "outletsAfter"])) return INVALID;
  const clientId = uuid(raw.clientId), outletsLimit = bounded(raw.outletsLimit, CLIENT_OUTLETS_DEFAULT, CLIENT_OUTLETS_MAX);
  const outletsAfter = given(raw.outletsAfter) ? uuid(raw.outletsAfter) : null;
  if (!clientId) return bad({ clientId: "Invalid." });
  if (outletsLimit === null || (given(raw.outletsAfter) && outletsAfter === null)) return bad({ input: "Invalid paging." });
  return { ok: true, value: { clientId, outletsLimit, outletsAfter } };
}
/** Staff detail: ended placements come in bounded pages. `historyAfter` is a placement id returned by the previous page. */
export function validateStaffGet(raw: unknown): Checked<StaffGetQuery> {
  if (!shape(raw, ["staffId"], ["historyLimit", "historyAfter"])) return INVALID;
  const staffId = uuid(raw.staffId), historyLimit = bounded(raw.historyLimit, STAFF_HISTORY_DEFAULT, STAFF_HISTORY_MAX);
  const historyAfter = given(raw.historyAfter) ? uuid(raw.historyAfter) : null;
  if (!staffId) return bad({ staffId: "Invalid." });
  if (historyLimit === null || (given(raw.historyAfter) && historyAfter === null)) return bad({ input: "Invalid paging." });
  return { ok: true, value: { staffId, historyLimit, historyAfter } };
}
