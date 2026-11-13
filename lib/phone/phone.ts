/**
 * Pure phone helpers for the shared country-code phone input. No I/O, no React.
 *
 * Canonical format sent to the server (docs/contracts/account-uniqueness.md):
 * "+<dial code><national digits without the leading trunk 0>", digits only, e.g.
 * "+2348012345678". The server still validates and canonicalises on its own
 * (lib/auth/identity.ts) and enforces uniqueness; this file is a UX convenience.
 */
import { DEFAULT_ISO, detectCountry, getCountry, type Country } from "./countries";

export type PhoneStatus = "empty" | "partial" | "valid" | "invalid";

export type PhoneCheck = {
  status: PhoneStatus;
  /** "+<digits>" when valid, otherwise "". */
  canonical: string;
  /** Plain-language message, or null when the number is empty or valid. */
  error: string | null;
  country: Country;
  /** National digits without the trunk 0. */
  national: string;
};

const digitsOf = (s: string) => s.replace(/\D/g, "");

/** Most national digits we ever accept: the country's maximum, and 15 in total with the dial code. */
export function maxNational(c: Country): number {
  return Math.min(c.max, 15 - c.dial.length);
}

/** Drops the leading trunk 0 ("0801..." -> "801...") except where the 0 is part of the number (Italy). */
export function stripTrunk(c: Country, national: string): string {
  return c.keepZero ? national : national.replace(/^0+/, "");
}

export type ParsedPhone = {
  country: Country;
  /** National digits, trunk 0 removed. */
  national: string;
  /** The value started with a "+" / "00" code that matches no country in the table. */
  unknownCode: boolean;
};

/**
 * Reads a stored or typed value:
 *  - "+2348012345678" or legacy "+234 801 234 5678"  -> country found from the code
 *  - "0801 234 5678" / "801 234 5678"                  -> the hinted country (default Nigeria)
 *  - "2348012345678" (code pasted without "+")         -> the hinted country, when the length says so
 */
export function parsePhone(value: string, hintIso: string = DEFAULT_ISO): ParsedPhone {
  const hint = getCountry(hintIso);
  const s = (value ?? "").trim();
  let digits = digitsOf(s);
  let intl = s.startsWith("+");
  if (!intl && digits.startsWith("00") && digits.length > 4) {
    intl = true;
    digits = digits.slice(2);
  }
  if (intl) {
    const c = detectCountry(digits, hint.iso);
    if (!c) return { country: hint, national: digits, unknownCode: true };
    return { country: c, national: stripTrunk(c, digits.slice(c.dial.length)), unknownCode: false };
  }
  if (digits.startsWith(hint.dial) && digits.length - hint.dial.length >= hint.min && digits.length > maxNational(hint) + 1) {
    digits = digits.slice(hint.dial.length);
  }
  return { country: hint, national: stripTrunk(hint, digits), unknownCode: false };
}

/** "+<dial><national>" for what has been typed so far ("" when there are no digits yet). Not a validity check. */
export function toCanonical(c: Country, raw: string): string {
  if (raw.startsWith("+")) return "";
  const nat = stripTrunk(c, digitsOf(raw));
  return nat ? `+${c.dial}${nat}` : "";
}

/** Groups national digits the way the country's example is written ("801 234 5678"). */
export function groupNational(c: Country, digits: string): string {
  const sizes = c.example.split(" ").map((g) => g.length);
  const out: string[] = [];
  let i = 0;
  for (const n of sizes) {
    if (i >= digits.length) break;
    out.push(digits.slice(i, i + n));
    i += n;
  }
  if (i < digits.length) out.push(digits.slice(i));
  return out.join(" ");
}

/** Text shown in the number box for the typed digits: "0801 234 5678" keeps the 0 the person typed. */
export function displayRaw(c: Country, raw: string): string {
  if (raw.startsWith("+")) return raw;
  if (!c.keepZero && raw.startsWith("0")) return "0" + groupNational(c, raw.slice(1));
  return groupNational(c, raw);
}

/** Display form of a stored value: "+2348012345678" -> "+234 801 234 5678". Returns the input if it cannot be read. */
export function formatPhone(value: string, hintIso: string = DEFAULT_ISO): string {
  if (!value || !value.trim()) return "";
  const p = parsePhone(value, hintIso);
  if (p.unknownCode || !p.national) return value;
  return `+${p.country.dial} ${groupNational(p.country, p.national)}`;
}

/** The country-aware text the person typed or pasted -> the country and typed digits to keep. */
export function normalizeInput(text: string, iso: string): { iso: string; raw: string } {
  const c = getCountry(iso);
  const t = text.trim();
  let plus = t.startsWith("+");
  let digits = digitsOf(t);
  if (!plus && digits.startsWith("00") && digits.length > 4) {
    plus = true;
    digits = digits.slice(2);
  }
  if (plus) {
    const m = detectCountry(digits, c.iso);
    if (m && digits.length > m.dial.length) return { iso: m.iso, raw: capRaw(m, digits.slice(m.dial.length)) };
    // Still typing the code ("+23"): keep it visible until it matches a country.
    return { iso: c.iso, raw: "+" + digits.slice(0, 6) };
  }
  if (digits.startsWith(c.dial) && digits.length - c.dial.length >= c.min && digits.length > maxNational(c) + 1) {
    digits = digits.slice(c.dial.length);
  }
  return { iso: c.iso, raw: capRaw(c, digits) };
}

function capRaw(c: Country, digits: string): string {
  return digits.slice(0, maxNational(c) + (!c.keepZero && digits.startsWith("0") ? 1 : 0));
}

function lengthMessage(c: Country): string {
  return c.min === c.max ? `Enter a phone number with ${c.min} digits.` : `Enter a phone number with ${c.min} to ${c.max} digits.`;
}

/** Plain-language message for an empty or too-short field (also used when a parent forces the field invalid). */
export function phoneHint(c: Country): string {
  return lengthMessage(c);
}

/**
 * Checks a stored/typed value. `hintIso` is the country to assume when the value has no "+code"
 * (the field's selected country; legacy national numbers like "0801 234 5678" use it).
 */
export function checkPhone(value: string, hintIso: string = DEFAULT_ISO): PhoneCheck {
  const hint = getCountry(hintIso);
  const s = (value ?? "").trim();
  if (!s) return { status: "empty", canonical: "", error: null, country: hint, national: "" };
  if (/[A-Za-z]/.test(s)) return { status: "invalid", canonical: "", error: "Phone numbers can only contain digits.", country: hint, national: "" };
  const p = parsePhone(s, hintIso);
  const { country: c, national } = p;
  const base = { country: c, national };
  if (p.unknownCode) return { ...base, status: "invalid", canonical: "", error: "That country code isn't in our list. Choose the country, then enter the number." };
  if (!national) return { ...base, status: "empty", canonical: "", error: null };
  if (national.length < c.min) return { ...base, status: "partial", canonical: "", error: lengthMessage(c) };
  if (national.length > maxNational(c)) return { ...base, status: "invalid", canonical: "", error: `That number is too long. ${lengthMessage(c)}` };
  if (c.pattern && !c.pattern.test.test(national)) return { ...base, status: "invalid", canonical: "", error: c.pattern.message };
  const canonical = `+${c.dial}${national}`;
  const total = canonical.length - 1;
  if (total < 8 || total > 15) return { ...base, status: "invalid", canonical: "", error: "Enter a phone number with a country code (8 to 15 digits in all)." };
  return { ...base, status: "valid", canonical, error: null };
}

/** True when the value is a complete, correctly sized number for its country. */
export const isValidPhone = (value: string, hintIso: string = DEFAULT_ISO): boolean => checkPhone(value, hintIso).status === "valid";

/** Error message for a required phone field ("" -> "Enter your phone number."), or null when fine. */
export function phoneError(value: string, hintIso: string = DEFAULT_ISO): string | null {
  const r = checkPhone(value, hintIso);
  if (r.status === "empty") return "Enter your phone number.";
  return r.error;
}

/**
 * Backwards-compatible loose check kept for existing callers: "+" then 8 to 15 digits, first digit
 * not 0. Prefer isValidPhone(), which also checks the length for the person's country.
 */
const INTL_PHONE_OK = /^\+[1-9]\d{7,14}$/;
export const isIntlPhone = (v: string): boolean => INTL_PHONE_OK.test(v.replace(/[\s().-]/g, ""));

