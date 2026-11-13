"use client";

/**
 * Applicant Documentation stage — typed form state + mock store.
 *
 * Covers the "thick step" of the confirmed recruitment workflow
 * (docs/BEELIV-APPLICANT-JOURNEY.md §4; field list: docs/BEELIV-SOURCE-OF-TRUTH.md
 * §7, docs/requirements/beeliv-onboarding-documentation-form-2026-09-29.md;
 * de-duplicated per docs/BEELIV-RECRUITMENT-SPEC.md §4 "one field, one home").
 * Approved for a frontend-only build by the project lead on 2026-09-29.
 *
 * Same pattern as lib/applicant/service.ts / saved.ts: a module-level store
 * exposed through useSyncExternalStore, persisted to localStorage under its
 * OWN key, keyed by application id, hydrated after mount (SSR-safe). Swap
 * this module for a Supabase-backed one later without touching the screens.
 * It does NOT define schema, RLS, or recruitment-stage transitions — submitting
 * only records `submittedAt` here; moving the application to Verification is
 * the backend's job, not assumed by this file.
 *
 * SENSITIVE DATA (🔒 in RECRUITMENT-SPEC §4; SOURCE-OF-TRUTH §8; CLAUDE.md
 * Stage 2C): NIN number, bank details, physically-challenged status + detail
 * and a newly picked NIN copy are deliberately NOT part of DocumentationDraft.
 * They are typed as SensitiveDetails, held in React component memory only,
 * and must never be passed to saveDocumentationDraft() or written to storage
 * of any kind. Real storage is gated on Beeliv's sensitive-data decision.
 *
 * Flagged, not resolved here: next-of-kin details are also listed as
 * sensitive in SOURCE-OF-TRUTH §8 (not 🔒 in the spec table). They ARE
 * persisted to this mock, like the profile's emergency contact already is —
 * revisit before any real data is loaded.
 */
import { isValidPhone as isValidPhoneNumber } from "@/lib/phone/phone";
import { useEffect, useSyncExternalStore } from "react";
import { DOCUMENTATION_TERMS } from "./documentation-terms";

const STORAGE_KEY = "beeliv-applicant-documentation-v1";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

/**
 * RECRUITMENT-SPEC §4: email, phone, birthday (= date of birth), sex (= the
 * profile's gender), nationality, state of origin, LGA/province/tribe, home
 * address and the passport photo are PROFILE fields. They're read live from
 * the profile (profileFacts()) and shown prefilled — never stored a second
 * time here. Only Documentation-owned, non-sensitive fields are persisted.
 */
export type PersonalSection = {
  // "Which team do you belong to?" is deliberately NOT collected: the project
  // lead decided (2026-09-29) to leave it out of the Documentation form.
  relationshipStatus: string;
  education: string;
};

/**
 * Extra employer detail for a profile employment-history entry (spec §4: the
 * current/previous organisation is NOT a second list). Organisation, job
 * title and dates come from the profile entry identified by `entryKey`.
 */
export type EmployerDetail = {
  /** "role|company" of the profile entry this detail belongs to ("" if none). */
  entryKey: string;
  location: string;
  /** "Organisation Website, e-mail, or social media handle" */
  contact: string;
  description: string;
  manager: string;
};

export type CurrentEmploymentSection = EmployerDetail & {
  /** Only offered when the profile lists no current job. */
  notEmployed: boolean;
};

export type PreviousEmploymentSection = EmployerDetail & {
  /** Only offered when the profile lists no previous job. */
  none: boolean;
};

export type NextOfKinSection = {
  /** Spec §4: "Same as my emergency contact" prefills name/phone/relationship live from the profile. */
  sameAsEmergency: boolean;
  name: string;
  phone: string;
  address: string;
  relationship: string;
};

/** Everything that may be persisted. Sensitive (🔒) fields are intentionally absent. */
export type DocumentationDraft = {
  applicationId: string;
  /** Last step the applicant was on — resume where they left off. */
  step: number;
  personal: PersonalSection;
  current: CurrentEmploymentSection;
  previous: PreviousEmploymentSection;
  nextOfKin: NextOfKinSection;
  /** One tick per term, in DOCUMENTATION_TERMS order. */
  terms: boolean[];
  /** Typed full-name signature. */
  signature: string;
  startedAt: string;
  updatedAt: string;
  /** The form's "Timestamp" — ISO, null until submitted. Never typed. */
  submittedAt: string | null;
};

/** MEMORY ONLY. Never persist, log, toast or pass to saveDocumentationDraft(). */
export type SensitiveDetails = {
  nin: string;
  bankAccountName: string;
  bankAccountNumber: string;
  /** Typed a second time so a typo is caught before it reaches payroll. */
  bankAccountConfirm: string;
  bankName: string;
  /** The applicant ticked: this account is in my own name. */
  bankOwnAccount: boolean;
  physicallyChallenged: "Yes" | "No" | "";
  /** Optional short detail when physicallyChallenged === "Yes". */
  physicalDetail: string;
  /** A NIN copy picked in THIS session (file name only; nothing is uploaded). */
  ninCopyFileName: string | null;
};

export const EMPTY_SENSITIVE: SensitiveDetails = {
  nin: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankAccountConfirm: "",
  bankName: "",
  bankOwnAccount: false,
  physicallyChallenged: "",
  physicalDetail: "",
  ninCopyFileName: null,
};

/* ------------------------------------------------------------------ */
/* Profile reads (read-only)                                            */
/* ------------------------------------------------------------------ */

/** Profile-owned values the Documentation form shows prefilled (spec §4). */
export type ProfileFacts = {
  fullName: string;
  email: string;
  phone: string;
  /** ISO "YYYY-MM-DD" (the profile stores "14 March 1996"). */
  birthday: string;
  /** Same field as the profile's gender: "Female" | "Male" | "" (not given). */
  sex: string;
  nationality: string;
  stateOfOrigin: string;
  lgaTribe: string;
  homeAddress: string;
};

export type ProfileJob = { key: string; role: string; organisation: string; location: string; period: string };

/**
 * Structural subset of ApplicantProfile. Optional members are read
 * defensively — a parallel change is adding gender / state-of-origin fields.
 */
export type ProfileLike = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  gender?: string;
  nationality?: string;
  state?: string;
  lga?: string;
  employmentHistory?: { role: string; company: string; period: string }[];
  emergencyContact?: { name: string; relationship: string; phone: string };
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "14 March 1996" → "1996-03-14" (already-ISO passes through; "" if unparseable). */
export function displayDateToIso(display: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(display)) return display;
  const m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(display.trim());
  if (!m) return "";
  const i = MONTHS_SHORT.findIndex((x) => x.toLowerCase() === m[2].toLowerCase().slice(0, 3));
  return i < 0 ? "" : `${m[3]}-${String(i + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** "Mar 2019" → "2019-03"; "" if unparseable. */
export function monthLabelToIso(label: string): string {
  const m = /^([A-Za-z]{3})[a-z]*\s+(\d{4})$/.exec(label.trim());
  if (!m) return "";
  const i = MONTHS_SHORT.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
  return i < 0 ? "" : `${m[2]}-${String(i + 1).padStart(2, "0")}`;
}

/** "2019-03" → "Mar 2019"; "1996-03-14" → "14 Mar 1996". */
export function formatIsoLabel(value: string): string {
  const r = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  if (!r) return "";
  const month = MONTHS_SHORT[Number(r[2]) - 1] ?? "";
  return r[3] ? `${Number(r[3])} ${month} ${r[1]}` : `${month} ${r[1]}`;
}

export function profileFacts(profile: ProfileLike): ProfileFacts {
  return {
    fullName: profile.fullName ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    birthday: displayDateToIso(profile.dateOfBirth ?? ""),
    // Female or Male only (project-lead decision 2026-09-29); anything else reads as not yet given.
    sex: profile.gender === "Female" || profile.gender === "Male" ? profile.gender : "",
    nationality: profile.nationality ?? "",
    stateOfOrigin: profile.state ?? "",
    lgaTribe: profile.lga ?? "",
    homeAddress: profile.address ?? "",
  };
}

function toJob(e: { role: string; company: string; period: string }): ProfileJob {
  const [organisation = "", location = ""] = e.company.split("·").map((x) => x.trim());
  return { key: `${e.role}|${e.company}`, role: e.role, organisation, location, period: e.period.split("·")[0].trim() };
}

function endMonthOf(period: string): string {
  const range = period.split("·")[0];
  return monthLabelToIso(range.split(/[–-]/)[1]?.trim() ?? "");
}

/** Current job = the profile entry with no end date ("Present"). */
export function currentJob(profile: ProfileLike): ProfileJob | null {
  const e = (profile.employmentHistory ?? []).find((x) => /present/i.test(x.period));
  return e ? toJob(e) : null;
}

/** Previous job = the most recently ENDED profile entry. */
export function previousJob(profile: ProfileLike): ProfileJob | null {
  const ended = (profile.employmentHistory ?? []).filter((x) => !/present/i.test(x.period));
  if (!ended.length) return null;
  const latest = ended.reduce((best, x) => (endMonthOf(x.period) > endMonthOf(best.period) ? x : best));
  return toJob(latest);
}

/* ------------------------------------------------------------------ */
/* Option lists                                                         */
/* ------------------------------------------------------------------ */

/**
 * PROPOSED pending Beeliv — the source form names the field ("What is your
 * Relationship status") but not its options.
 */
export const RELATIONSHIP_STATUS_OPTIONS = ["Single", "Married", "Divorced", "Widowed"];

/**
 * PROPOSED pending Beeliv — the source form names "Educational Qualification"
 * but not its options.
 */
export const EDUCATION_OPTIONS = ["SSCE / WAEC", "OND", "HND", "Bachelor's degree", "Master's degree", "Professional certificate", "Other"];

/**
 * Nigerian banks for the Bank name dropdown. PROPOSED list (public
 * information, not a business rule) — confirm with Beeliv whether
 * microfinance / fintech accounts are acceptable for salary payment.
 */
export const NIGERIAN_BANKS = [
  "Access Bank",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank (FCMB)",
  "Globus Bank",
  "Guaranty Trust Bank (GTBank)",
  "Jaiz Bank",
  "Keystone Bank",
  "Kuda Microfinance Bank",
  "Lotus Bank",
  "Moniepoint Microfinance Bank",
  "OPay",
  "PalmPay",
  "Parallex Bank",
  "Polaris Bank",
  "Premium Trust Bank",
  "Providus Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "Sterling Bank",
  "SunTrust Bank",
  "Titan Trust Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Unity Bank",
  "Wema Bank",
  "Zenith Bank",
  "Other",
];

/* ------------------------------------------------------------------ */
/* Sections + completeness                                              */
/* ------------------------------------------------------------------ */

export const DOCUMENTATION_SECTIONS = [
  { key: "personal", label: "Personal & identity", description: "Check the details from your profile, then add a few more." },
  { key: "current", label: "Current employment", description: "A few more details about the job you have now." },
  { key: "previous", label: "Previous employment", description: "A few more details about your most recent previous job." },
  { key: "nextOfKin", label: "Next of kin", description: "Who Beeliv should contact on your behalf if needed." },
  { key: "sensitive", label: "NIN & bank details", description: "Your National Identification Number and the account you'd be paid into." },
  { key: "documents", label: "Documents", description: "A copy of your NIN and a passport photograph." },
  { key: "review", label: "Review", description: "Check everything before you sign." },
  { key: "terms", label: "Terms & declarations", description: "Read and accept the onboarding terms, then sign." },
] as const;

export type DocumentationSectionKey = (typeof DOCUMENTATION_SECTIONS)[number]["key"];

export type SectionProgress = { done: number; total: number; complete: boolean };

/** Read-only context the completeness check needs (all from the profile / its documents). */
export type ProgressContext = {
  facts: ProfileFacts;
  hasCurrentJob: boolean;
  hasPreviousJob: boolean;
  emergency: { name: string; relationship: string; phone: string };
  /** A usable passport photograph exists on the applicant's record. */
  passportPhoto: boolean;
  /** A usable NIN-slip Valid ID exists on the applicant's record. */
  ninCopy: boolean;
};

const filled = (v: string | null | undefined) => Boolean(v && v.trim());
/** A complete phone number for its own country (country-code input, lib/phone). Legacy "+234 803 555 0142" still passes. */
export const isValidPhone = (v: string) => isValidPhoneNumber(v);
export const isValidNin = (v: string) => /^\d{11}$/.test(v);
export const isValidNuban = (v: string) => /^\d{10}$/.test(v);

/** True when the bank account name plausibly belongs to the applicant (every word of the shorter name appears in the longer one, any order). Soft warning only. */
export function bankNameLooksLikeApplicant(accountName: string, profileName: string): boolean {
  const words = (x: string) => x.toLowerCase().replace(/[^a-zs]/g, " ").split(/s+/).filter(Boolean);
  const a = words(accountName);
  const b = words(profileName);
  if (!a.length || !b.length) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.every((w) => long.includes(w));
}

/** Case-insensitive, whitespace-tolerant signature match. */
export function signatureMatches(signature: string, fullName: string): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  return norm(signature) !== "" && norm(signature) === norm(fullName);
}

/** Effective next-of-kin values ("Same as my emergency contact" reads the profile live). */
export function nextOfKinValues(k: NextOfKinSection, emergency: ProgressContext["emergency"]): Omit<NextOfKinSection, "sameAsEmergency"> {
  return k.sameAsEmergency
    ? { name: emergency.name, phone: emergency.phone, relationship: emergency.relationship, address: k.address }
    : { name: k.name, phone: k.phone, relationship: k.relationship, address: k.address };
}

function count(checks: boolean[]): SectionProgress {
  const done = checks.filter(Boolean).length;
  return { done, total: checks.length, complete: done === checks.length };
}

/**
 * Per-section completeness.
 *
 * PROPOSAL (field requiredness is TBD in every source doc — BEELIV-APPLICANT-
 * JOURNEY.md §4 "Requires Management Clarification"): a section counts as
 * complete when the fields marked "Required" in the UI are filled; fields
 * marked "Optional" (organisation contact handle, physical-challenge detail)
 * don't count. Profile-owned facts count too (they're needed), but are fixed
 * in the profile, not here. With no current/previous job on the profile, the
 * "not currently employed" / "no previous employment" switch completes that
 * section. Change this function once Beeliv confirms.
 */
export function sectionProgress(
  draft: DocumentationDraft,
  sensitive: SensitiveDetails,
  ctx: ProgressContext,
): Record<DocumentationSectionKey, SectionProgress> {
  const p = draft.personal;
  const f = ctx.facts;
  const c = draft.current;
  const v = draft.previous;
  const k = nextOfKinValues(draft.nextOfKin, ctx.emergency);
  const hasNinCopy = ctx.ninCopy || filled(sensitive.ninCopyFileName);
  const extra = (e: EmployerDetail) => [filled(e.location), filled(e.description), filled(e.manager)];

  const personal = count([
    filled(f.email),
    isValidPhone(f.phone),
    filled(f.birthday),
    filled(f.sex),
    filled(f.nationality),
    filled(f.stateOfOrigin),
    filled(f.lgaTribe),
    filled(f.homeAddress),
    filled(p.relationshipStatus),
    filled(p.education),
    filled(sensitive.physicallyChallenged),
    ctx.passportPhoto,
  ]);
  const current = ctx.hasCurrentJob ? count(extra(c)) : count([c.notEmployed]);
  const previous = ctx.hasPreviousJob ? count(extra(v)) : count([v.none]);
  const nextOfKin = count([filled(k.name), isValidPhone(k.phone), filled(k.address), filled(k.relationship)]);
  const sens = count([isValidNin(sensitive.nin), filled(sensitive.bankAccountName), isValidNuban(sensitive.bankAccountNumber), sensitive.bankAccountConfirm === sensitive.bankAccountNumber && isValidNuban(sensitive.bankAccountConfirm), filled(sensitive.bankName), sensitive.bankOwnAccount]);
  const documents = count([hasNinCopy, ctx.passportPhoto]);
  const terms = count([...draft.terms.map(Boolean), signatureMatches(draft.signature, f.fullName)]);
  const review = count([[personal, current, previous, nextOfKin, sens, documents].every((s) => s.complete)]);

  return { personal, current, previous, nextOfKin, sensitive: sens, documents, review, terms };
}

/** Overall percent across the fillable sections (review excluded — it has no fields). */
export function overallPercent(progress: Record<DocumentationSectionKey, SectionProgress>): number {
  const keys: DocumentationSectionKey[] = ["personal", "current", "previous", "nextOfKin", "sensitive", "documents", "terms"];
  const sum = keys.reduce((acc, key) => acc + progress[key].done / progress[key].total, 0);
  return Math.round((sum / keys.length) * 100);
}

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

type StoreState = Record<string, DocumentationDraft>;

let state: StoreState = {};
let hydrated = false;
const listeners = new Set<() => void>();
const EMPTY: StoreState = {};

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode, quota) — keep in memory only.
  }
}

function setState(next: StoreState) {
  state = next;
  persist();
  emit();
}

function nowIso() {
  return new Date().toISOString();
}

/** Documentation-owned defaults derived (read-only) from the profile, e.g. which entry an employer detail belongs to. */
export type DocumentationPrefill = Partial<{
  current: Partial<CurrentEmploymentSection>;
  previous: Partial<PreviousEmploymentSection>;
}>;

function blankDraft(applicationId: string, prefill: DocumentationPrefill): DocumentationDraft {
  const detail: EmployerDetail = { entryKey: "", location: "", contact: "", description: "", manager: "" };
  const now = nowIso();
  return {
    applicationId,
    step: 0,
    personal: { relationshipStatus: "", education: "" },
    current: { ...detail, notEmployed: false, ...prefill.current },
    previous: { ...detail, none: false, ...prefill.previous },
    nextOfKin: { sameAsEmergency: false, name: "", phone: "", address: "", relationship: "" },
    terms: DOCUMENTATION_TERMS.map(() => false),
    signature: "",
    startedAt: now,
    updatedAt: now,
    submittedAt: null,
  };
}

/** Copies only keys the base shape has, and only when the type matches. */
function pick<T extends object>(base: T, from: unknown): T {
  const out = { ...base };
  if (from && typeof from === "object") {
    for (const key of Object.keys(base) as (keyof T)[]) {
      const val = (from as T)[key];
      if (typeof val === typeof base[key]) out[key] = val;
    }
  }
  return out;
}

/**
 * Rebuilds a draft from ONLY the persisted shape (defence in depth: a stray
 * sensitive key can never ride along into storage) and fills defaults for
 * records saved by an older shape of this form.
 */
function sanitize(d: Partial<DocumentationDraft> & { applicationId: string }): DocumentationDraft {
  const blank = blankDraft(d.applicationId, {});
  return {
    applicationId: d.applicationId,
    step: typeof d.step === "number" ? d.step : 0,
    personal: pick(blank.personal, d.personal),
    current: pick(blank.current, d.current),
    previous: pick(blank.previous, d.previous),
    nextOfKin: pick(blank.nextOfKin, d.nextOfKin),
    terms: DOCUMENTATION_TERMS.map((_, i) => Boolean(d.terms?.[i])),
    signature: typeof d.signature === "string" ? d.signature : "",
    startedAt: typeof d.startedAt === "string" ? d.startedAt : blank.startedAt,
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : blank.updatedAt,
    submittedAt: typeof d.submittedAt === "string" ? d.submittedAt : null,
  };
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const next: StoreState = {};
      for (const [id, rec] of Object.entries(parsed as Record<string, Partial<DocumentationDraft>>)) {
        if (rec && typeof rec === "object") next[id] = sanitize({ ...rec, applicationId: id });
      }
      state = next;
      emit();
    }
  } catch {
    // Corrupt/unavailable storage — start empty.
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Reactive map of documentation drafts, keyed by application id. */
export function useDocumentationStore(): StoreState {
  const snap = useSyncExternalStore(subscribe, () => state, () => EMPTY);
  useEffect(hydrate, []);
  return snap;
}

/** Reactive read of one application's documentation record (null if not started). */
export function useDocumentation(applicationId: string): DocumentationDraft | null {
  return useDocumentationStore()[applicationId] ?? null;
}

/** Sync read — only meaningful after the store has hydrated (i.e. from an effect or handler). */
export function getDocumentationSync(applicationId: string): DocumentationDraft | null {
  return state[applicationId] ?? null;
}

/**
 * Draft continuity: returns this application's existing documentation draft
 * (resume where the applicant left off) or creates one. Idempotent — never
 * creates a duplicate. Call from an effect/handler, after the store has hydrated.
 */
export function getOrCreateDocumentationDraft(applicationId: string, prefill: DocumentationPrefill): { draft: DocumentationDraft; resumed: boolean } {
  const existing = state[applicationId];
  if (existing) return { draft: existing, resumed: true };
  const draft = blankDraft(applicationId, prefill);
  setState({ ...state, [applicationId]: draft });
  return { draft, resumed: false };
}

/** Saves the (non-sensitive) draft. Ignored once submitted. */
export function saveDocumentationDraft(draft: DocumentationDraft): DocumentationDraft | null {
  const existing = state[draft.applicationId];
  if (existing?.submittedAt) return existing;
  const next = sanitize({ ...draft, updatedAt: nowIso() });
  setState({ ...state, [draft.applicationId]: next });
  return next;
}

/** Records submission (the form's "Timestamp"). Does not change the application's recruitment stage. */
export function submitDocumentation(draft: DocumentationDraft): DocumentationDraft {
  const at = nowIso();
  const next = sanitize({ ...draft, updatedAt: at, submittedAt: at });
  setState({ ...state, [draft.applicationId]: next });
  return next;
}

/** "12345678901" → "•••••••• 901" (only the last `keep` digits visible). */
export function maskDigits(value: string, keep = 3): string {
  if (!value) return "";
  const tail = value.slice(-keep);
  return `${"•".repeat(Math.max(0, value.length - keep))} ${tail}`.trim();
}

/** "Mar 2019 – Dec 2022 · 3 yrs" -> { start: "2019-03", end: "2022-12" } (end is "" for Present). */
export function periodToRange(period: string): { start: string; end: string } {
  const [a = "", b = ""] = period.split(/[–-]/).map((x) => x.split("·")[0].trim());
  return { start: monthLabelToIso(a), end: monthLabelToIso(b) };
}

/** { start: "2019-03", end: "" } -> "Mar 2019 – Present". Returns "" when there is no start month. */
export function rangeToPeriod(range: { start: string; end: string }): string {
  return range.start ? `${formatIsoLabel(range.start)} – ${range.end ? formatIsoLabel(range.end) : "Present"}` : "";
}
