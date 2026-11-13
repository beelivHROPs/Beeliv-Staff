/**
 * Client-side validation for the auth screens. Pure functions, no I/O.
 * Each validator returns an error message, or null when the value is fine.
 *
 * These checks are a UX convenience only. The real password / email rules must
 * be enforced again by the auth backend when it is connected.
 */
import { normaliseAccountPhone } from "@/lib/auth/identity";
import { checkPhone } from "@/lib/phone/phone";
import { AUTH_MESSAGES, PASSWORD_RULE } from "./auth-content";

export function normaliseEmail(value: string): string {
  return value.trim();
}

export function isValidEmail(value: string): boolean {
  const v = normaliseEmail(value);
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export function validateEmail(value: string): string | null {
  if (!normaliseEmail(value)) return AUTH_MESSAGES.emailRequired;
  return isValidEmail(value) ? null : AUTH_MESSAGES.emailInvalid;
}

export function validateFullName(value: string): string | null {
  return value.trim().length >= 2 ? null : AUTH_MESSAGES.nameRequired;
}

/** Accepts +, spaces, dashes, dots and brackets; needs 7 to 15 digits (E.164 limit). */
export function validatePhone(value: string): string | null {
  const v = value.trim();
  if (!v) return AUTH_MESSAGES.phoneRequired;
  // The country-code phone input (components/shared/CountryPhoneInput) sends "+<digits>"; the
  // plain-language length check for the chosen country lives in lib/phone.
  return checkPhone(v).error;
}

/**
 * ACCOUNT phone (signup, invitation acceptance, staff records). One phone number
 * belongs to one account (docs/contracts/account-uniqueness.md), so it must be
 * canonical international: explicit country code, never a guessed country.
 * Uses Codex's pure normaliser (lib/auth/identity.ts) so the browser and the
 * server accept exactly the same numbers. Separators are tidied, not rejected.
 *
 * Not for enquiry/contact forms (those collect a way to call someone back, not an
 * account identifier, and keep the looser validatePhone above).
 */
export function canonicalAccountPhone(value: string): string | null {
  return normaliseAccountPhone(value);
}

export function validateAccountPhone(value: string): string | null {
  if (!value.trim()) return AUTH_MESSAGES.phoneRequired;
  const r = checkPhone(value);
  if (r.status !== "valid") return r.error ?? AUTH_MESSAGES.phoneCountryCode;
  return normaliseAccountPhone(r.canonical) ? null : AUTH_MESSAGES.phoneCountryCode;
}

/** Optional account phone: empty is fine, anything typed must be canonical international. */
export function validateOptionalAccountPhone(value: string): string | null {
  return value.trim() ? validateAccountPhone(value) : null;
}

/** Log in: only "not empty". The rule is enforced when a password is created. */
export function validateLoginPassword(value: string): string | null {
  return value ? null : AUTH_MESSAGES.passwordRequired;
}

export function meetsPasswordRule(value: string): boolean {
  return (
    value.length >= PASSWORD_RULE.minLength &&
    (!PASSWORD_RULE.requiresNumber || /\d/.test(value))
  );
}

/** Sign up: COPY.md rule, "At least 8 characters, with a number." */
export function validateNewPassword(value: string): string | null {
  if (!value) return AUTH_MESSAGES.passwordCreateRequired;
  return meetsPasswordRule(value) ? null : AUTH_MESSAGES.passwordRule;
}

/** Reset password: the confirmation must be present and identical to the new password. */
export function validateConfirmPassword(confirm: string, password: string): string | null {
  if (!confirm) return AUTH_MESSAGES.passwordConfirmRequired;
  return confirm === password ? null : AUTH_MESSAGES.passwordMismatch;
}

export type StrengthScore = 0 | 1 | 2 | 3;

/**
 * 0 = nothing typed, 1 = does not meet the rule yet, 2 = meets the rule,
 * 3 = meets the rule and is long (12+) or mixes case / symbols.
 */
export function passwordStrength(value: string): StrengthScore {
  if (!value) return 0;
  if (!meetsPasswordRule(value)) return 1;
  const mixed =
    /[a-z]/.test(value) && /[A-Z]/.test(value) ? true : /[^A-Za-z0-9]/.test(value);
  return value.length >= 12 || mixed ? 3 : 2;
}
