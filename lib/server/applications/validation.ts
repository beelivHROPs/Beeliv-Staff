/** Pure, bounded validators. The database repeats the structural checks; these are the first gate. */
import type { ApplyForm } from "./types";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const LIMITS = {
  name: 120, phone: 40, email: 254, short: 200, long: 2000,
  sectors: 20, sectorLength: 80, skillCategories: 30, skillItems: 40, skillLength: 80,
  screeningAnswers: 30, formBytes: 32768,
} as const;
/** Sensitive keys that must never appear anywhere in generic JSON (mirrors the SQL check). */
const SENSITIVE_KEY = /^(nin|bvn|national_?id|bank.*|account.*|iban|medical.*|health.*|passport.*)$/i;
const FORM_KEYS = ["fullName", "preferredName", "phone", "whatsapp", "email", "yearsExperience", "expectedSalary", "availability", "earliestStart", "preferredLocation", "willingShifts", "willingWeekends", "willingHolidays", "sectors", "skills", "screeningAnswers"] as const;

export type Checked<T> = { ok: true; value: T } | { ok: false; fields: Record<string, string> };

export function plain(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
/** Exact key set: rejects missing-by-design extras so the browser cannot smuggle owner/status/score fields. */
function exactKeys(raw: unknown, keys: readonly string[], optional: readonly string[] = []): raw is Record<string, unknown> {
  if (!plain(raw)) return false;
  const present = Object.keys(raw);
  return present.every((k) => keys.includes(k) || optional.includes(k)) && keys.every((k) => present.includes(k));
}
function uuid(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value.toLowerCase() : null;
}
function revision(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 1 && (value as number) <= 1_000_000 ? (value as number) : null;
}

export type OpenCommand = { requestId: string; vacancyId: string };
export type SaveCommand = { requestId: string; applicationId: string; expectedRevision: number; form: ApplyForm };
export type SubmitCommand = { requestId: string; applicationId: string; expectedRevision: number };

export function validateOpen(raw: unknown): Checked<OpenCommand> {
  if (!exactKeys(raw, ["requestId", "vacancyId"])) return { ok: false, fields: { input: "Invalid request." } };
  const requestId = uuid(raw.requestId), vacancyId = uuid(raw.vacancyId);
  if (!requestId || !vacancyId) return { ok: false, fields: { ...(requestId ? {} : { requestId: "Invalid." }), ...(vacancyId ? {} : { vacancyId: "Invalid." }) } };
  return { ok: true, value: { requestId, vacancyId } };
}
export function validateSubmit(raw: unknown): Checked<SubmitCommand> {
  if (!exactKeys(raw, ["requestId", "applicationId", "expectedRevision"])) return { ok: false, fields: { input: "Invalid request." } };
  const requestId = uuid(raw.requestId), applicationId = uuid(raw.applicationId), expectedRevision = revision(raw.expectedRevision);
  if (!requestId || !applicationId || expectedRevision === null) return { ok: false, fields: { input: "Invalid request." } };
  return { ok: true, value: { requestId, applicationId, expectedRevision } };
}
export function validateSave(raw: unknown): Checked<SaveCommand> {
  if (!exactKeys(raw, ["requestId", "applicationId", "expectedRevision", "form"])) return { ok: false, fields: { input: "Invalid request." } };
  const requestId = uuid(raw.requestId), applicationId = uuid(raw.applicationId), expectedRevision = revision(raw.expectedRevision);
  if (!requestId || !applicationId || expectedRevision === null) return { ok: false, fields: { input: "Invalid request." } };
  const form = validateForm(raw.form);
  if (!form.ok) return form;
  return { ok: true, value: { requestId, applicationId, expectedRevision, form: form.value } };
}
export function validateId(raw: unknown): Checked<{ applicationId: string }> {
  if (!exactKeys(raw, ["applicationId"])) return { ok: false, fields: { input: "Invalid request." } };
  const applicationId = uuid(raw.applicationId);
  return applicationId ? { ok: true, value: { applicationId } } : { ok: false, fields: { applicationId: "Invalid." } };
}
export function validatePage(raw: unknown, allowVacancy: boolean): Checked<{ page: number; pageSize: number; vacancyId?: string }> {
  if (!exactKeys(raw, [], ["page", "pageSize", ...(allowVacancy ? ["vacancyId"] : [])])) return { ok: false, fields: { input: "Invalid request." } };
  const page = raw.page ?? 1, pageSize = raw.pageSize ?? 20;
  if (!Number.isSafeInteger(page) || (page as number) < 1 || (page as number) > 9999 || !Number.isSafeInteger(pageSize) || (pageSize as number) < 1 || (pageSize as number) > 50) return { ok: false, fields: { input: "Invalid paging." } };
  let vacancyId: string | undefined;
  if (raw.vacancyId !== undefined) {
    const parsed = uuid(raw.vacancyId);
    if (!parsed) return { ok: false, fields: { vacancyId: "Invalid." } };
    vacancyId = parsed;
  }
  return { ok: true, value: { page: page as number, pageSize: pageSize as number, ...(vacancyId ? { vacancyId } : {}) } };
}

/** No control characters; trimmed; bounded. Empty strings are kept so a cleared field saves as cleared. */
function text(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.length > max * 2) return null;
  const clean = value.trim();
  return clean.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(clean) ? clean : null;
}

export function validateForm(raw: unknown): Checked<ApplyForm> {
  const fields: Record<string, string> = Object.create(null);
  if (!plain(raw)) return { ok: false, fields: { form: "Invalid." } };
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (SENSITIVE_KEY.test(key)) fields[key] = "This information is not collected here.";
    else if (!(FORM_KEYS as readonly string[]).includes(key)) fields[key] = "This field cannot be set here.";
  }
  const short = (key: string, max: number) => {
    if (raw[key] === undefined) return;
    const value = text(raw[key], max);
    if (value === null) fields[key] = "Invalid value."; else out[key] = value;
  };
  short("fullName", LIMITS.name); short("preferredName", LIMITS.name);
  short("phone", LIMITS.phone); short("whatsapp", LIMITS.phone); short("email", LIMITS.email);
  for (const key of ["yearsExperience", "expectedSalary", "earliestStart", "preferredLocation"]) short(key, LIMITS.short);
  short("availability", LIMITS.long);
  if (typeof out.email === "string" && out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) fields.email = "Enter a valid email.";
  for (const key of ["willingShifts", "willingWeekends", "willingHolidays"]) {
    if (raw[key] === undefined) continue;
    if (raw[key] === "Yes" || raw[key] === "No") out[key] = raw[key]; else fields[key] = "Choose Yes or No.";
  }
  if (raw.sectors !== undefined) {
    const sectors = raw.sectors;
    if (!Array.isArray(sectors) || sectors.length > LIMITS.sectors) fields.sectors = "Invalid.";
    else {
      const items = sectors.map((s) => text(s, LIMITS.sectorLength));
      if (items.some((s) => s === null || s === "")) fields.sectors = "Invalid."; else out.sectors = items;
    }
  }
  if (raw.skills !== undefined) {
    if (!plain(raw.skills) || Object.keys(raw.skills).length > LIMITS.skillCategories) fields.skills = "Invalid.";
    else {
      const skills: Record<string, string[]> = Object.create(null);
      for (const [category, list] of Object.entries(raw.skills)) {
        const name = text(category, LIMITS.skillLength);
        const items = Array.isArray(list) && list.length <= LIMITS.skillItems ? list.map((s) => text(s, LIMITS.skillLength)) : null;
        if (!name || !items || items.some((s) => s === null || s === "")) { fields.skills = "Invalid."; break; }
        skills[name] = items as string[];
      }
      if (!fields.skills) out.skills = { ...skills };
    }
  }
  if (raw.screeningAnswers !== undefined) {
    if (!plain(raw.screeningAnswers) || Object.keys(raw.screeningAnswers).length > LIMITS.screeningAnswers) fields.screeningAnswers = "Invalid.";
    else {
      const answers: Record<string, string> = {};
      for (const [id, value] of Object.entries(raw.screeningAnswers)) {
        const clean = text(value, LIMITS.long);
        if (!/^[A-Za-z0-9_-]{1,100}$/.test(id) || clean === null) { fields.screeningAnswers = "Invalid."; break; }
        answers[id] = clean;
      }
      if (!fields.screeningAnswers) out.screeningAnswers = answers;
    }
  }
  if (Object.keys(fields).length) return { ok: false, fields: { ...fields } };
  if (new TextEncoder().encode(JSON.stringify(out)).length > LIMITS.formBytes) return { ok: false, fields: { form: "Too large." } };
  return { ok: true, value: out as ApplyForm };
}
