/**
 * DTO projection. Rebuilds every reply from an explicit allow-list of fields, so an unexpected key from the database (a stray
 * ciphertext, digest or value) cannot reach the browser. Masks are re-checked against the exact shapes; a malformed mask fails
 * closed (null, which the service turns into "unavailable"). Nothing here ever receives or returns a full sensitive value.
 */
import { MASK_SHAPES } from "./mask";
import { plain } from "./validation";
import type { ChecklistDto, EmployerDto, EmploymentDto, PersonalDetailsDto, SensitiveState, SensitiveStatusDto } from "./types";

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.length <= max ? v : null);
const ISO = /^\d{4}-\d{2}-\d{2}T[0-9:.]+(Z|[+-]\d{2}(:?\d{2})?)$/;
const when = (v: unknown): string | null | undefined => (v === null ? null : typeof v === "string" && ISO.test(v) && v.length <= 40 ? v : undefined);
const maskOf = (v: unknown, shape: RegExp): string | null | undefined => (v === null ? null : typeof v === "string" && shape.test(v) ? v : undefined);
const state = (v: unknown): SensitiveState | null => (v === "empty" || v === "saved" || v === "change-pending" ? v : null);
const bool = (v: unknown): v is boolean => typeof v === "boolean";
export const id = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export function projectPersonal(raw: unknown): PersonalDetailsDto | null {
  if (!plain(raw)) return null;
  const sex = raw.sex === "" || raw.sex === "Female" || raw.sex === "Male" ? raw.sex : null;
  const rel = str(raw.relationshipStatus, 60), bday = str(raw.birthday, 10), nat = str(raw.nationality, 80), st = str(raw.stateOfOrigin, 80);
  const lga = str(raw.lga, 120), addr = str(raw.homeAddress, 300), edu = str(raw.education, 80);
  if (sex === null || rel === null || bday === null || nat === null || st === null || lga === null || addr === null || edu === null) return null;
  if (bday !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(bday)) return null;
  return { sex, relationshipStatus: rel, birthday: bday, nationality: nat, stateOfOrigin: st, lga, homeAddress: addr, education: edu };
}

function projectEmployer(raw: unknown): EmployerDto | null | undefined {
  if (raw === null) return null;
  if (!plain(raw)) return undefined;
  const o = str(raw.organisation, 200), l = str(raw.location, 200), c = str(raw.contact, 200), p = str(raw.position, 120), d = str(raw.description, 500), m = str(raw.manager, 120);
  const s = str(raw.startMonth, 7), e = str(raw.endMonth, 7);
  if (o === null || l === null || c === null || p === null || d === null || m === null || s === null || e === null) return undefined;
  if ((s !== "" && !/^\d{4}-\d{2}$/.test(s)) || (e !== "" && !/^\d{4}-\d{2}$/.test(e))) return undefined;
  return { organisation: o, location: l, contact: c, position: p, description: d, manager: m, startMonth: s, endMonth: e };
}
export function projectEmployment(data: Record<string, unknown>): EmploymentDto | null {
  const current = projectEmployer(data.current), previous = projectEmployer(data.previous);
  return current === undefined || previous === undefined ? null : { current, previous };
}

/** Masked status only. Reads exactly the documented keys; unknown keys are dropped, not forwarded. */
export function projectStatus(raw: unknown): SensitiveStatusDto | null {
  if (!plain(raw) || !plain(raw.nextOfKin) || !plain(raw.nin) || !plain(raw.bank) || !plain(raw.accessibility)) return null;
  const k = raw.nextOfKin, n = raw.nin, b = raw.bank, a = raw.accessibility;
  const ks = state(k.state), ns = state(n.state), bs = state(b.state), as = state(a.state);
  const kn = maskOf(k.maskedName, MASK_SHAPES.name), kp = maskOf(k.maskedPhone, MASK_SHAPES.phone), nm = maskOf(n.masked, MASK_SHAPES.nin), bm = maskOf(b.maskedAccount, MASK_SHAPES.account);
  const ku = when(k.updatedAt), nu = when(n.updatedAt), bu = when(b.updatedAt), au = when(a.updatedAt);
  if (!ks || !ns || !bs || !as || kn === undefined || kp === undefined || nm === undefined || bm === undefined || ku === undefined || nu === undefined || bu === undefined || au === undefined) return null;
  // An empty section has no mask; a held section has one.
  const held = (s: SensitiveState, ...masks: (string | null)[]) => (s === "empty" ? masks.every((m) => m === null) : masks.every((m) => m !== null));
  if (!held(ks, kn, kp) || !held(ns, nm) || !held(bs, bm)) return null;
  return {
    nextOfKin: { state: ks, maskedName: kn, maskedPhone: kp, updatedAt: ku },
    nin: { state: ns, masked: nm, updatedAt: nu },
    bank: { state: bs, maskedAccount: bm, updatedAt: bu },
    accessibility: { state: as, updatedAt: au },
  };
}

export function projectChecklist(raw: unknown): ChecklistDto | null {
  if (!plain(raw)) return null;
  const keys = ["personal", "nextOfKin", "nin", "bank", "education", "currentEmployment", "previousEmployment", "accessibility"] as const;
  if (!keys.every((key) => bool(raw[key]))) return null;
  return {
    personal: raw.personal as boolean, nextOfKin: raw.nextOfKin as boolean, nin: raw.nin as boolean, bank: raw.bank as boolean, education: raw.education as boolean,
    currentEmployment: raw.currentEmployment as boolean, previousEmployment: raw.previousEmployment as boolean, accessibility: raw.accessibility as boolean,
  };
}
