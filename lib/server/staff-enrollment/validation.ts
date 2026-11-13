/**
 * Pure, bounded validators. The database repeats the structural checks; these are the first gate.
 * Unlike org-records this slice DOES carry sensitive keys (nin, account number, ...), so there is no key-name deny list here.
 * Instead every command has an EXACT key set: the browser cannot add a person id, status, mask, revision or time.
 * Error `fields` hold field names and fixed messages only. A submitted value is never echoed back.
 */
import { normaliseAccountPhone } from "../../auth/identity";
import type {
  AccessibilitySaveCommand, BankSaveCommand, EmployerDto, EmployerSaveCommand, KinSaveCommand, NinSaveCommand, PersonalDetailsDto, PersonalSaveCommand,
} from "./types";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Proposed limits, not approved product rules. */
export const LIMITS = {
  short: 80, medium: 120, address: 300, lga: 120, org: 200, contact: 200, description: 500, relationshipStatus: 60, education: 80,
  personName: 120, kinRelationship: 60, bankName: 80, accessibilityDetail: 200,
} as const;
export type Checked<T> = { ok: true; value: T } | { ok: false; fields: Record<string, string> };

export function plain(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
const bad = (fields: Record<string, string>): { ok: false; fields: Record<string, string> } => ({ ok: false, fields });
const INVALID = bad({ input: "Invalid request." });

/** Exact key set. Rejects extras and missing keys. */
function exact(raw: unknown, keys: readonly string[]): raw is Record<string, unknown> {
  if (!plain(raw)) return false;
  const present = Object.keys(raw);
  return present.length === keys.length && keys.every((k) => present.includes(k));
}
const uuid = (v: unknown): string | null => (typeof v === "string" && UUID.test(v) ? v.toLowerCase() : null);

/** Trimmed, bounded, no control characters (newline allowed only when `multiline`). Inner whitespace of single-line text is collapsed. */
function text(value: unknown, min: number, max: number, multiline = false): string | null {
  if (typeof value !== "string" || value.length > max * 2) return null;
  let clean = value.trim();
  if (!multiline) clean = clean.replace(/\s+/g, " ");
  const control = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/;
  return clean.length >= min && clean.length <= max && !control.test(clean) ? clean : null;
}
/** A person's name: letters, marks, spaces, apostrophe, hyphen and full stop only. No digits, so a number cannot hide in a name. */
function personName(value: unknown): string | null {
  const clean = text(value, 2, LIMITS.personName);
  return clean !== null && /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(clean) ? clean : null;
}

/** A real calendar date, yyyy-mm-dd, between 1900-01-01 and today (Africa/Lagos, UTC+1). The empty string means "not given". */
export function birthday(value: unknown, today = new Date(Date.now() + 3_600_000).toISOString().slice(0, 10)): string | null {
  if (value === "") return "";
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value <= today ? value : null;
}
/** yyyy-mm or "". */
function month(value: unknown): string | null {
  return value === "" ? "" : typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : null;
}
function collect(fields: Record<string, string>, key: string, value: string | null, message = "Check this field."): value is string {
  if (value === null) fields[key] = message;
  return value !== null;
}

/** NIN: exactly 11 digits, nothing else (no spaces, no dashes: the app already strips them). */
export const isNin = (v: unknown): v is string => typeof v === "string" && /^\d{11}$/.test(v);
/** Nigerian NUBAN account number: exactly 10 digits. */
export const isAccountNumber = (v: unknown): v is string => typeof v === "string" && /^\d{10}$/.test(v);

/* --------------------------------- personal details --------------------------------- */

const PERSONAL_KEYS = ["sex", "relationshipStatus", "birthday", "nationality", "stateOfOrigin", "lga", "homeAddress", "education"] as const;
function personalInput(raw: unknown, today?: string): Checked<PersonalDetailsDto> {
  if (!exact(raw, PERSONAL_KEYS)) return INVALID;
  const f: Record<string, string> = {};
  const sex = raw.sex === "" || raw.sex === "Female" || raw.sex === "Male" ? (raw.sex as PersonalDetailsDto["sex"]) : null;
  const relationshipStatus = text(raw.relationshipStatus, 0, LIMITS.relationshipStatus), bday = birthday(raw.birthday, today);
  const nationality = text(raw.nationality, 0, LIMITS.short), stateOfOrigin = text(raw.stateOfOrigin, 0, LIMITS.short), lga = text(raw.lga, 0, LIMITS.lga);
  const homeAddress = text(raw.homeAddress, 0, LIMITS.address, true), education = text(raw.education, 0, LIMITS.education);
  if (sex === null) f.sex = "Choose Female or Male.";
  collect(f, "relationshipStatus", relationshipStatus); collect(f, "birthday", bday, "Enter a real date that is not in the future.");
  collect(f, "nationality", nationality); collect(f, "stateOfOrigin", stateOfOrigin); collect(f, "lga", lga); collect(f, "homeAddress", homeAddress); collect(f, "education", education);
  return Object.keys(f).length ? bad(f)
    : { ok: true, value: { sex: sex!, relationshipStatus: relationshipStatus!, birthday: bday!, nationality: nationality!, stateOfOrigin: stateOfOrigin!, lga: lga!, homeAddress: homeAddress!, education: education! } };
}
export function validatePersonalSave(raw: unknown, today?: string): Checked<PersonalSaveCommand> {
  if (!exact(raw, ["requestId", "input"])) return INVALID;
  const requestId = uuid(raw.requestId); if (!requestId) return INVALID;
  const input = personalInput(raw.input, today); if (!input.ok) return input;
  return { ok: true, value: { requestId, input: input.value } };
}

/* ----------------------------------- employment ----------------------------------- */

const EMPLOYER_KEYS = ["organisation", "location", "contact", "position", "description", "manager", "startMonth", "endMonth"] as const;
function employerInput(raw: unknown, which: "current" | "previous"): Checked<EmployerDto> {
  if (!exact(raw, EMPLOYER_KEYS)) return INVALID;
  const f: Record<string, string> = {};
  const organisation = text(raw.organisation, 1, LIMITS.org), location = text(raw.location, 0, LIMITS.org), contact = text(raw.contact, 0, LIMITS.contact);
  const position = text(raw.position, 0, LIMITS.medium), description = text(raw.description, 0, LIMITS.description, true), manager = text(raw.manager, 0, LIMITS.medium);
  const startMonth = month(raw.startMonth), endMonth = month(raw.endMonth);
  collect(f, "organisation", organisation, "Enter the organisation name."); collect(f, "location", location); collect(f, "contact", contact);
  collect(f, "position", position); collect(f, "description", description); collect(f, "manager", manager);
  collect(f, "startMonth", startMonth, "Choose a month."); collect(f, "endMonth", endMonth, "Choose a month.");
  if (startMonth !== null && endMonth !== null) {
    if (which === "current" && (startMonth !== "" || endMonth !== "")) f.startMonth = "Dates are only for a previous job.";
    if (startMonth !== "" && endMonth !== "" && endMonth < startMonth) f.endMonth = "The end month cannot be before the start month.";
  }
  return Object.keys(f).length ? bad(f)
    : { ok: true, value: { organisation: organisation!, location: location!, contact: contact!, position: position!, description: description!, manager: manager!, startMonth: startMonth!, endMonth: endMonth! } };
}
export function validateEmployerSave(raw: unknown): Checked<EmployerSaveCommand> {
  if (!exact(raw, ["requestId", "which", "input"])) return INVALID;
  const requestId = uuid(raw.requestId);
  if (!requestId || (raw.which !== "current" && raw.which !== "previous")) return INVALID;
  const input = employerInput(raw.input, raw.which); if (!input.ok) return input;
  return { ok: true, value: { requestId, which: raw.which, input: input.value } };
}

/* --------------------------------- sensitive sections --------------------------------- */

export function validateKinSave(raw: unknown): Checked<KinSaveCommand> {
  if (!exact(raw, ["requestId", "input"])) return INVALID;
  const requestId = uuid(raw.requestId); if (!requestId) return INVALID;
  if (!exact(raw.input, ["name", "phone", "address", "relationship"])) return INVALID;
  const f: Record<string, string> = {}, i = raw.input;
  const name = personName(i.name), phone = normaliseAccountPhone(i.phone), address = text(i.address, 3, LIMITS.address), relationship = text(i.relationship, 2, LIMITS.kinRelationship);
  collect(f, "name", name, "Enter the full name."); collect(f, "phone", phone, "Use the international format, e.g. +2348012345678.");
  collect(f, "address", address, "Enter an address."); collect(f, "relationship", relationship, "Enter the relationship.");
  return Object.keys(f).length ? bad(f) : { ok: true, value: { requestId, input: { name: name!, phone: phone!, address: address!, relationship: relationship! } } };
}
export function validateNinSave(raw: unknown): Checked<NinSaveCommand> {
  if (!exact(raw, ["requestId", "input"])) return INVALID;
  const requestId = uuid(raw.requestId); if (!requestId) return INVALID;
  if (!exact(raw.input, ["nin"])) return INVALID;
  return isNin(raw.input.nin) ? { ok: true, value: { requestId, input: { nin: raw.input.nin } } } : bad({ nin: "Enter exactly 11 digits." });
}
export function validateBankSave(raw: unknown): Checked<BankSaveCommand> {
  if (!exact(raw, ["requestId", "input"])) return INVALID;
  const requestId = uuid(raw.requestId); if (!requestId) return INVALID;
  if (!exact(raw.input, ["accountName", "accountNumber", "bankName"])) return INVALID;
  const f: Record<string, string> = {}, i = raw.input;
  const accountName = personName(i.accountName), bankName = text(i.bankName, 2, LIMITS.bankName);
  const accountNumber = isAccountNumber(i.accountNumber) ? i.accountNumber : null;
  collect(f, "accountName", accountName, "Enter the name on the account."); collect(f, "accountNumber", accountNumber, "Enter exactly 10 digits."); collect(f, "bankName", bankName, "Choose a bank.");
  return Object.keys(f).length ? bad(f) : { ok: true, value: { requestId, input: { accountName: accountName!, accountNumber: accountNumber!, bankName: bankName! } } };
}
export function validateAccessibilitySave(raw: unknown): Checked<AccessibilitySaveCommand> {
  if (!exact(raw, ["requestId", "input"])) return INVALID;
  const requestId = uuid(raw.requestId); if (!requestId) return INVALID;
  if (!exact(raw.input, ["physicallyChallenged", "detail"]) || typeof raw.input.physicallyChallenged !== "boolean") return INVALID;
  const detail = text(raw.input.detail, 0, LIMITS.accessibilityDetail);
  if (detail === null) return bad({ detail: "Keep this under 200 characters." });
  if (!raw.input.physicallyChallenged && detail !== "") return bad({ detail: "Leave this empty unless you answered Yes." });
  return { ok: true, value: { requestId, input: { physicallyChallenged: raw.input.physicallyChallenged, detail } } };
}

/** Reads take no input at all. Anything in the body other than an empty object is refused. */
export function validateEmpty(raw: unknown): Checked<Record<string, never>> {
  return plain(raw) && Object.keys(raw).length === 0 ? { ok: true, value: {} } : INVALID;
}
