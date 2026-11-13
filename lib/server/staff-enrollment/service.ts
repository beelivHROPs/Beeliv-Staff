/**
 * Staff enrollment service (own record only). Pure: every effect goes through the injected dependencies, so it is testable
 * offline. The actor is ALWAYS the verified session identity (deps.verifyStaff); the request body can never name a person.
 * Sensitive values are sealed here in memory and only ciphertext, a keyed digest and a mask are handed to the gateway.
 * No reply, error, log line or audit detail produced here contains a submitted sensitive value.
 */
import { maskAccount, maskName, maskNin, maskPhone } from "./mask";
import { id, projectChecklist, projectEmployment, projectPersonal, projectStatus } from "./project";
import {
  plain, validateAccessibilitySave, validateBankSave, validateEmpty, validateEmployerSave, validateKinSave, validateNinSave, validatePersonalSave, type Checked,
} from "./validation";
import type {
  ChecklistDto, EmploymentDto, PersonalDetailsDto, ProfileDto, ProfileSource, RpcReply, SensitiveSection, SensitiveStatusDto, StaffEnrollmentDependencies, StaffErrorCode, StaffFailure,
  StaffIdentity, StaffOperation, StaffResult,
} from "./types";

/**
 * Database reason -> safe public code. Anything unknown becomes `unavailable`; database text is never forwarded.
 * `duplicate` deliberately becomes the SAME generic `not_saved` as any other save failure, so the endpoint cannot be used to
 * learn whether a NIN or bank account is already held by someone else.
 */
const REASONS: Readonly<Record<string, StaffErrorCode>> = {
  no_access: "forbidden", invalid_request: "invalid_request", conflict: "conflict", duplicate: "not_saved", rate_limited: "rate_limited", unavailable: "unavailable",
};
const fail = (code: StaffErrorCode, extra: Partial<StaffFailure> = {}): StaffFailure => ({ ok: false, code, ...extra });
type Reply = { data: Record<string, unknown> };
type Value<T> = Promise<StaffResult<{ value: T }>>;

async function staff(deps: StaffEnrollmentDependencies, write: boolean): Promise<StaffIdentity | StaffFailure> {
  if (!deps.enabled || (write && !deps.writesEnabled)) return fail("unavailable");
  let who: StaffIdentity | null;
  try { who = await deps.verifyStaff(); } catch { return fail("unavailable"); }
  if (!who || !who.emailVerified || !id(who.uid) || !id(who.personId) || !id(who.sessionId)) return fail("unauthenticated");
  // No second factor for Staff own-data entry (design open question 7); the database re-checks the session and entitlement.
  return who;
}
async function limited(deps: StaffEnrollmentDependencies, uid: string): Promise<StaffFailure | null> {
  try { await deps.consumeLimit(uid); return null; } catch (error) {
    return plain(error) && error.code === "rate_limited" ? fail("rate_limited") : fail("unavailable");
  }
}
function fingerprint(deps: StaffEnrollmentDependencies, op: StaffOperation, command: unknown): string | null {
  try { const f = deps.fingerprint(op, command); return /^[a-f0-9]{64}$/.test(f) ? f : null; } catch { return null; }
}
const FIELD_NAME = /^[A-Za-z]{1,30}$/;
function fieldsOf(value: unknown): Record<string, string> | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const name of value.slice(0, 8)) if (typeof name === "string" && FIELD_NAME.test(name)) out[name] = "Check this field.";
  return Object.keys(out).length ? out : undefined;
}
/** Returns the reply record, a definite denial, or null when the outcome cannot be trusted. */
function interpret(reply: RpcReply | undefined, allowFields: boolean): Reply | StaffFailure | null {
  if (!reply || reply.error || !plain(reply.data)) return null;
  if (reply.data.ok === false) {
    const code = typeof reply.data.reason === "string" && REASONS[reply.data.reason] ? REASONS[reply.data.reason] : "unavailable";
    // Field names are only ever forwarded for a plain validation failure of NON-sensitive sections.
    const fields = allowFields && code === "invalid_request" ? fieldsOf(reply.data.fields) : undefined;
    return fail(code, fields ? { fields } : {});
  }
  return reply.data.ok === true ? { data: reply.data } : null;
}
const denied = (x: Reply | StaffFailure | null): x is StaffFailure => !!x && "ok" in x && x.ok === false;

async function mutate<T>(requestId: string, allowFields: boolean, call: () => PromiseLike<RpcReply>, build: (d: Record<string, unknown>) => T | null): Value<T> {
  let reply: RpcReply | undefined;
  try { reply = await call(); } catch { return fail("outcome_unknown", { requestId }); }
  const got = interpret(reply, allowFields);
  if (denied(got)) return got;
  const value = got ? build(got.data) : null;
  return value === null ? fail("outcome_unknown", { requestId }) : { ok: true, value };
}
async function read<T>(call: () => PromiseLike<RpcReply>, build: (d: Record<string, unknown>) => T | null): Value<T> {
  let reply: RpcReply | undefined;
  try { reply = await call(); } catch { return fail("unavailable"); }
  const got = interpret(reply, false);
  if (denied(got)) return got;
  const value = got ? build(got.data) : null;
  return value === null ? fail("unavailable") : { ok: true, value };
}
const actor = (who: StaffIdentity) => ({ actorUid: who.uid, sessionId: who.sessionId });
const rev = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 1 && (v as number) <= 1_000_000;

type Prepared<C extends { requestId: string }> = { who: StaffIdentity; cmd: C; fp: string } | StaffFailure;
/** Common write preamble: authenticate, validate, fingerprint, rate-limit. Nothing runs for an invalid body. */
async function prepareWrite<C extends { requestId: string }>(raw: unknown, deps: StaffEnrollmentDependencies, op: StaffOperation, validate: (r: unknown) => Checked<C>): Promise<Prepared<C>> {
  const who = await staff(deps, true); if ("ok" in who) return who;
  const checked = validate(raw); if (!checked.ok) return fail("invalid_request", { fields: checked.fields });
  const fp = fingerprint(deps, op, checked.value); if (!fp) return fail("unavailable");
  const limit = await limited(deps, who.uid); if (limit) return limit;
  return { who, cmd: checked.value, fp };
}
async function prepareRead(raw: unknown, deps: StaffEnrollmentDependencies): Promise<StaffIdentity | StaffFailure> {
  const who = await staff(deps, false); if ("ok" in who) return who;
  const q = validateEmpty(raw); if (!q.ok) return fail("invalid_request", { fields: q.fields });
  const limit = await limited(deps, who.uid); if (limit) return limit;
  return who;
}

/* ------------------------------------ reads ------------------------------------ */

export async function getPersonalDetails(raw: unknown, deps: StaffEnrollmentDependencies): Value<PersonalDetailsDto> {
  const who = await prepareRead(raw, deps); if ("ok" in who) return who;
  return read(() => deps.gateway.personalGet(actor(who)), (d) => projectPersonal(d.item));
}
export async function getEmployment(raw: unknown, deps: StaffEnrollmentDependencies): Value<EmploymentDto> {
  const who = await prepareRead(raw, deps); if ("ok" in who) return who;
  return read(() => deps.gateway.employmentGet(actor(who)), projectEmployment);
}
export async function getSensitiveStatus(raw: unknown, deps: StaffEnrollmentDependencies): Value<SensitiveStatusDto> {
  const who = await prepareRead(raw, deps); if ("ok" in who) return who;
  return read(() => deps.gateway.sensitiveStatus(actor(who)), (d) => projectStatus(d.status));
}
export async function getChecklist(raw: unknown, deps: StaffEnrollmentDependencies): Value<ChecklistDto> {
  const who = await prepareRead(raw, deps); if ("ok" in who) return who;
  return read(() => deps.gateway.checklistGet(actor(who)), (d) => projectChecklist(d.checklist));
}

const SETUP_STATES = ["pending-setup", "pending-approval", "active", "suspended"];
/** Own profile from the verified session. Takes `{}` only; nothing in the body can name a person. Returns exactly five fields. */
export async function getProfile(raw: unknown, deps: StaffEnrollmentDependencies): Value<ProfileDto> {
  if (!deps.enabled || !deps.readProfile) return fail("unavailable");
  const q = validateEmpty(raw); if (!q.ok) return fail("invalid_request", { fields: q.fields });
  let src: ProfileSource | null;
  try { src = await deps.readProfile(); } catch (error) { return plain(error) && error.code === "forbidden" ? fail("forbidden") : fail("unavailable"); }
  if (!src || typeof src.uid !== "string" || !src.uid) return fail("unauthenticated");
  const limit = await limited(deps, src.uid); if (limit) return limit;
  const e = src.entitlements;
  if (typeof src.fullName !== "string" || src.fullName.length > 200 || typeof src.phone !== "string" || src.phone.length > 40 || typeof src.email !== "string" || !src.email || src.email.length > 254
    || !SETUP_STATES.includes(src.setupState) || !e || typeof e.applicant !== "boolean" || typeof e.staff !== "boolean") return fail("unavailable");
  return { ok: true, value: { fullName: src.fullName, phone: src.phone, email: src.email, setupState: src.setupState, entitlements: { applicant: e.applicant, staff: e.staff } } };
}

/* ----------------------------------- writes ----------------------------------- */

export async function savePersonalDetails(raw: unknown, deps: StaffEnrollmentDependencies): Value<PersonalDetailsDto> {
  const p = await prepareWrite(raw, deps, "personal-save", validatePersonalSave); if ("ok" in p) return p;
  return mutate(p.cmd.requestId, true, () => deps.gateway.personalSave({ ...actor(p.who), requestId: p.cmd.requestId, fingerprint: p.fp, input: p.cmd.input }),
    (d) => (rev(d.revision) && typeof d.replayed === "boolean" ? projectPersonal(d.item) : null));
}
export async function saveEmployer(raw: unknown, deps: StaffEnrollmentDependencies): Value<EmploymentDto> {
  const p = await prepareWrite(raw, deps, "employer-save", validateEmployerSave); if ("ok" in p) return p;
  return mutate(p.cmd.requestId, true, () => deps.gateway.employerSave({ ...actor(p.who), requestId: p.cmd.requestId, fingerprint: p.fp, which: p.cmd.which, input: p.cmd.input }),
    (d) => (rev(d.revision) && typeof d.replayed === "boolean" ? projectEmployment(d) : null));
}

type SensitivePlan = { section: SensitiveSection; payload: Record<string, unknown>; mask: Record<string, string>; digestOf: { section: "nin" | "bank"; normalised: string } | null };
const bankKey = (bankName: string, accountNumber: string) => `${bankName.toLowerCase().replace(/\s+/g, " ")}|${accountNumber}`;

/**
 * Shared pipeline for NIN, bank, next of kin and accessibility: validate, authenticate, rate-limit, seal in memory, hand ONLY
 * ciphertext + keyed digest + mask to the gateway, then answer with the masked status read back from the database.
 * Failures carry a code and, for a validation failure, field names with fixed messages. They never carry a value, and a
 * duplicate is reported exactly like any other save failure (`not_saved`).
 */
async function saveSensitive<C extends { requestId: string }>(
  raw: unknown, deps: StaffEnrollmentDependencies, op: StaffOperation, validate: (r: unknown) => Checked<C>, plan: (cmd: C) => SensitivePlan,
): Value<SensitiveStatusDto> {
  const p = await prepareWrite(raw, deps, op, validate); if ("ok" in p) return p;
  const { section, payload, mask, digestOf } = plan(p.cmd);
  let sealed, digest;
  try {
    sealed = deps.sealer.seal(section, p.who.personId, payload);
    digest = digestOf ? deps.sealer.digest(digestOf.section, digestOf.normalised) : null;
  } catch { return fail("unavailable"); } // keys missing or invalid: fail closed, say nothing about why
  return mutate(p.cmd.requestId, false,
    () => deps.gateway.sensitiveSave({ ...actor(p.who), requestId: p.cmd.requestId, fingerprint: p.fp, personId: p.who.personId, section, sealed, mask, digest }),
    (d) => {
      if (d.section !== section || !(d.outcome === "added" || d.outcome === "change_requested" || d.outcome === "unchanged") || typeof d.replayed !== "boolean") return null;
      const status = projectStatus(d.status); if (!status) return null;
      const key = section === "next_of_kin" ? "nextOfKin" : section === "nin" ? "nin" : section === "bank" ? "bank" : "accessibility";
      // Cross-check the reply against what the database says it did, so a confused reply cannot be shown as success.
      if (status[key].state === "empty" || (d.outcome === "change_requested" && status[key].state !== "change-pending")) return null;
      return status;
    });
}

export const saveNextOfKin = (raw: unknown, deps: StaffEnrollmentDependencies) =>
  saveSensitive(raw, deps, "kin-save", validateKinSave, ({ input }) => ({
    section: "next_of_kin", payload: { name: input.name, phone: input.phone, address: input.address, relationship: input.relationship },
    mask: { maskedName: maskName(input.name), maskedPhone: maskPhone(input.phone) }, digestOf: null,
  }));
export const saveNin = (raw: unknown, deps: StaffEnrollmentDependencies) =>
  saveSensitive(raw, deps, "nin-save", validateNinSave, ({ input }) => ({
    section: "nin", payload: { nin: input.nin }, mask: { masked: maskNin(input.nin) }, digestOf: { section: "nin", normalised: input.nin },
  }));
export const saveBankDetails = (raw: unknown, deps: StaffEnrollmentDependencies) =>
  saveSensitive(raw, deps, "bank-save", validateBankSave, ({ input }) => ({
    section: "bank", payload: { accountName: input.accountName, accountNumber: input.accountNumber, bankName: input.bankName },
    mask: { maskedAccount: maskAccount(input.accountNumber) }, digestOf: { section: "bank", normalised: bankKey(input.bankName, input.accountNumber) },
  }));
export const saveAccessibility = (raw: unknown, deps: StaffEnrollmentDependencies) =>
  saveSensitive(raw, deps, "accessibility-save", validateAccessibilitySave, ({ input }) => ({
    section: "accessibility", payload: { physicallyChallenged: input.physicallyChallenged, detail: input.detail }, mask: {}, digestOf: null,
  }));
