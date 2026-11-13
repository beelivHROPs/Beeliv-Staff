/**
 * Request Talent form state, per-step validation and the payload builder.
 * Pure functions, no I/O. Validation is a UX convenience only: the backend must
 * re-validate everything (see request.ts).
 *
 * DRAFT DECISIONS (flagged to the project lead):
 *   - Required: business name, location; needs (at least one); per selected
 *     need the fields listed below; contact name, email, phone.
 *   - Optional: outlet, target start date, job title, best time to call, and
 *     the free-text "Tell us a little more".
 */
import { validateEmail, validateFullName, validatePhone } from "./auth-rules";
import { MESSAGES, NEED_IDS, STEP_COUNT, type StepNumber } from "./request-content";
import type { NeedId, RequestInput } from "./request";

export type Draft = {
  step: StepNumber;
  business: { name: string; outlet: string; location: string };
  needs: NeedId[];
  recruitment: { roles: string; headcount: string; location: string; startDate: string };
  training: { teamSize: string; topics: string };
  details: string;
  contact: { name: string; jobTitle: string; email: string; phone: string; bestTime: string };
};

export function emptyDraft(): Draft {
  return {
    step: 1,
    business: { name: "", outlet: "", location: "" },
    needs: [],
    recruitment: { roles: "", headcount: "", location: "", startDate: "" },
    training: { teamSize: "", topics: "" },
    details: "",
    contact: { name: "", jobTitle: "", email: "", phone: "", bestTime: "" },
  };
}

/** Field keys, used for errors, refs and focus order. */
export type FieldKey =
  | "business.name"
  | "business.location"
  | "needs"
  | "recruitment.roles"
  | "recruitment.headcount"
  | "recruitment.location"
  | "recruitment.startDate"
  | "training.teamSize"
  | "training.topics"
  | "contact.name"
  | "contact.email"
  | "contact.phone";

export type Errors = Partial<Record<FieldKey, string>>;

/** DOM/focus order per step. */
export const FIELD_ORDER: Record<StepNumber, readonly FieldKey[]> = {
  1: ["business.name", "business.location"],
  2: ["needs"],
  3: [
    "recruitment.roles",
    "recruitment.headcount",
    "recruitment.location",
    "recruitment.startDate",
    "training.teamSize",
    "training.topics",
  ],
  4: ["contact.name", "contact.email", "contact.phone"],
};

const POSITIVE_INT = /^\d{1,5}$/;

function isPositiveInt(v: string): boolean {
  const t = v.trim();
  return POSITIVE_INT.test(t) && Number(t) >= 1;
}

/** Local yyyy-mm-dd for `date`. */
export function localIsoDate(date: Date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function validateStep(step: StepNumber, d: Draft, today: string = localIsoDate()): Errors {
  const e: Errors = {};
  if (step === 1) {
    if (d.business.name.trim().length < 2) e["business.name"] = MESSAGES.businessName;
    if (!d.business.location.trim()) e["business.location"] = MESSAGES.businessLocation;
  }
  if (step === 2) {
    if (d.needs.length === 0) e.needs = MESSAGES.needsRequired;
  }
  if (step === 3) {
    if (d.needs.includes("recruitment")) {
      const r = d.recruitment;
      if (!r.roles.trim()) e["recruitment.roles"] = MESSAGES.roles;
      if (!isPositiveInt(r.headcount)) e["recruitment.headcount"] = MESSAGES.headcount;
      if (!r.location.trim()) e["recruitment.location"] = MESSAGES.recLocation;
      if (r.startDate && (!/^\d{4}-\d{2}-\d{2}$/.test(r.startDate) || r.startDate < today)) {
        e["recruitment.startDate"] = MESSAGES.startDate;
      }
    }
    if (d.needs.includes("training")) {
      if (!isPositiveInt(d.training.teamSize)) e["training.teamSize"] = MESSAGES.teamSize;
      if (!d.training.topics.trim()) e["training.topics"] = MESSAGES.topics;
    }
  }
  if (step === 4) {
    const n = validateFullName(d.contact.name);
    const m = validateEmail(d.contact.email);
    const p = validatePhone(d.contact.phone);
    if (n) e["contact.name"] = n;
    if (m) e["contact.email"] = m;
    if (p) e["contact.phone"] = p;
  }
  return e;
}

/** First step (1..upTo-1) that is not valid yet; `upTo` when every earlier step is fine. */
export function furthestValidStep(upTo: StepNumber, d: Draft): StepNumber {
  for (let s = 1; s < upTo; s++) {
    if (Object.keys(validateStep(s as StepNumber, d)).length > 0) return s as StepNumber;
  }
  return upTo;
}

/** Needs that have no drawn field list and share the one free-text field. */
export const DETAIL_NEEDS: readonly NeedId[] = ["systems", "audit", "unsure"];

export function hasDetailsSection(needs: readonly NeedId[]): boolean {
  return needs.some((n) => DETAIL_NEEDS.includes(n));
}

/** Toggle a need. "Not sure yet" is exclusive: it clears the others, and they clear it. */
export function toggleNeed(current: readonly NeedId[], id: NeedId): NeedId[] {
  if (current.includes(id)) return current.filter((n) => n !== id);
  if (id === "unsure") return ["unsure"];
  const next: NeedId[] = [...current.filter((n) => n !== "unsure"), id];
  return NEED_IDS.filter((n) => next.includes(n));
}

const clean = (v: string) => v.trim().replace(/\s+/g, " ");
const orNull = (v: string) => (clean(v) ? clean(v) : null);

/** Build the backend payload. Call only after every step validates. */
export function buildInput(d: Draft): RequestInput {
  const has = (n: NeedId) => d.needs.includes(n);
  return {
    business: {
      name: clean(d.business.name),
      outlet: orNull(d.business.outlet),
      location: clean(d.business.location),
    },
    needs: NEED_IDS.filter(has),
    recruitment: has("recruitment")
      ? {
          roles: clean(d.recruitment.roles),
          headcount: Number(d.recruitment.headcount.trim()),
          location: clean(d.recruitment.location),
          targetStartDate: d.recruitment.startDate || null,
        }
      : null,
    training: has("training")
      ? { teamSize: Number(d.training.teamSize.trim()), topics: clean(d.training.topics) }
      : null,
    details: hasDetailsSection(d.needs) ? (d.details.trim() ? d.details.trim() : null) : null,
    contact: {
      name: clean(d.contact.name),
      jobTitle: orNull(d.contact.jobTitle),
      email: d.contact.email.trim(),
      phone: d.contact.phone.trim(),
      bestTimeToCall: orNull(d.contact.bestTime),
    },
  };
}

/* ------------------------------ persistence ------------------------------ */

const isStr = (v: unknown): v is string => typeof v === "string";
const str = (v: unknown, max: number) => (isStr(v) ? v.slice(0, max) : "");

/** Defensive parse of whatever sessionStorage holds; null when it is not a usable draft. */
export function parseDraft(raw: unknown): Draft | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const b = (o.business ?? {}) as Record<string, unknown>;
  const r = (o.recruitment ?? {}) as Record<string, unknown>;
  const t = (o.training ?? {}) as Record<string, unknown>;
  const c = (o.contact ?? {}) as Record<string, unknown>;
  const needs = Array.isArray(o.needs)
    ? NEED_IDS.filter((n) => (o.needs as unknown[]).includes(n))
    : [];
  const step = Number(o.step);
  return {
    step: (Number.isInteger(step) && step >= 1 && step <= STEP_COUNT ? step : 1) as StepNumber,
    business: { name: str(b.name, 200), outlet: str(b.outlet, 200), location: str(b.location, 200) },
    needs: needs.includes("unsure") && needs.length > 1 ? ["unsure"] : needs,
    recruitment: {
      roles: str(r.roles, 500),
      headcount: str(r.headcount, 6),
      location: str(r.location, 200),
      startDate: str(r.startDate, 10),
    },
    training: { teamSize: str(t.teamSize, 6), topics: str(t.topics, 500) },
    details: str(o.details, 2000),
    contact: {
      name: str(c.name, 200),
      jobTitle: str(c.jobTitle, 200),
      email: str(c.email, 254),
      phone: str(c.phone, 40),
      bestTime: str(c.bestTime, 200),
    },
  };
}

/* -------------------------------- summaries ------------------------------ */

/** "Name · Outlet · Location" (outlet omitted when blank). */
export function businessSummary(d: Draft): string {
  return [d.business.name, d.business.outlet, d.business.location]
    .map(clean)
    .filter(Boolean)
    .join(" · ");
}

/** Short line for the completed "Your requirement" card. */
export function requirementSummary(d: Draft): string {
  const parts: string[] = [];
  if (d.needs.includes("recruitment")) {
    const n = d.recruitment.headcount.trim();
    parts.push(`Recruitment, ${n} ${n === "1" ? "role" : "roles"}`);
  }
  if (d.needs.includes("training")) {
    parts.push(`Training, team of ${d.training.teamSize.trim()}`);
  }
  if (hasDetailsSection(d.needs) && d.details.trim()) parts.push("Notes added");
  return parts.length ? parts.join(" · ") : "No further details";
}
