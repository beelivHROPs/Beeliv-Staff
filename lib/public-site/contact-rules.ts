/**
 * Contact form state + validation. Pure functions, no I/O. A UX convenience
 * only - the backend must re-validate everything (see contact.ts).
 *
 * DRAFT DECISIONS (flagged to the project lead, wireframe draws no asterisks /
 * "optional" markers to confirm required-ness beyond the fields below):
 *   - Required: full name, email, phone, message, consent.
 *   - Optional: role ("(work only)"), CV ("(work only - optional)").
 *   - "I'm a business" never reaches this validator: selecting it navigates
 *     straight to /request (see ContactForm), per the wireframe's own note
 *     ("sends you to the Request Talent form").
 */
import { validateEmail, validateFullName, validatePhone } from "./auth-rules";
import { CONTACT_MESSAGES } from "./contact-content";

export type ContactDraft = {
  name: string;
  email: string;
  phone: string;
  role: string;
  message: string;
  consent: boolean;
};

export function emptyContactDraft(): ContactDraft {
  return { name: "", email: "", phone: "", role: "", message: "", consent: false };
}

export type ContactFieldKey = "name" | "email" | "phone" | "message" | "consent";

export type ContactErrors = Partial<Record<ContactFieldKey, string>>;

export const CONTACT_FIELD_ORDER: readonly ContactFieldKey[] = [
  "name",
  "email",
  "phone",
  "message",
  "consent",
];

export function validateContact(d: ContactDraft): ContactErrors {
  const e: ContactErrors = {};
  const n = validateFullName(d.name);
  const em = validateEmail(d.email);
  const p = validatePhone(d.phone);
  if (n) e.name = n;
  if (em) e.email = em;
  if (p) e.phone = p;
  if (!d.message.trim()) e.message = CONTACT_MESSAGES.messageRequired;
  if (!d.consent) e.consent = CONTACT_MESSAGES.consentRequired;
  return e;
}

const clean = (v: string) => v.trim().replace(/\s+/g, " ");
const orNull = (v: string) => (clean(v) ? clean(v) : null);

export { clean, orNull };
