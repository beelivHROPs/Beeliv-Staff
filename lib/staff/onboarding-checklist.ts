/**
 * Merges the server checklist (`checklist-get`, docs/contracts/staff-personal-details-wire.md) into the four profile
 * onboarding items. Pure and offline-testable. A tick comes ONLY from a server boolean that is exactly `true`; anything
 * missing, null or malformed is "not done". Agreements and documents are other slices and are not produced here.
 */
import type { OnboardingItem } from "./types";

export type EnrollmentChecklist = Partial<Record<"personal" | "nextOfKin" | "nin" | "bank" | "education" | "currentEmployment" | "previousEmployment" | "accessibility", unknown>>;

const PROFILE_ITEMS: ReadonlyArray<{ id: string; key: keyof EnrollmentChecklist; label: string; href: string; detail: string }> = [
  { id: "ob-personal", key: "personal", label: "Add your personal details", href: "/staff/profile#personal", detail: "Your birthday, address and where you are from." },
  { id: "ob-kin", key: "nextOfKin", label: "Add your next of kin", href: "/staff/profile#next-of-kin", detail: "Someone Beeliv can reach in an emergency." },
  { id: "ob-nin", key: "nin", label: "Add your NIN", href: "/staff/profile#identity", detail: "Your 11-digit National Identification Number." },
  { id: "ob-bank", key: "bank", label: "Add your bank details", href: "/staff/profile#banking", detail: "Account name, account number and bank." },
];

export function onboardingFromChecklist(checklist: EnrollmentChecklist | null | undefined): OnboardingItem[] {
  const c = checklist ?? {};
  return PROFILE_ITEMS.map((p) => ({ id: p.id, kind: "profile" as const, label: p.label, done: c[p.key] === true, agreement: null, href: p.href, detail: p.detail, dueDate: null }));
}

/** The same four profile steps as plain copy (title and the one-line reason), for the setup page's "Complete your profile" preview. No status, no values. */
export const PROFILE_STEP_COPY: ReadonlyArray<{ id: string; title: string; why: string }> = PROFILE_ITEMS.map((p) => ({ id: p.id, title: p.label, why: p.detail }));
