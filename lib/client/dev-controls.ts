"use client";

/**
 * DEV ONLY - the "Prototype state" control (mirrors Applicant / Staff). It
 * picks which development-fixture scenario the mock adapter serves, covering
 * the Client states in brief section 31. Delete this file, the pill in
 * ClientShell and the mock adapter when the real backend adapter goes in.
 */
import { useSyncExternalStore } from "react";

export type PrototypeMode =
  | "active"
  // First-time setup (invited, not yet set up): Overview welcome hero + /client/setup
  | "new-client"
  // Access / account states (replace the page with a full-page gate)
  | "invitation-required"
  | "invitation-expired"
  | "invitation-invalid"
  | "invitation-used"
  | "suspended"
  | "no-client-access"
  | "wrong-portal"
  | "no-outlets"
  // Empty data states
  | "no-workforce"
  | "no-attendance"
  | "no-schedule"
  | "no-candidates"
  | "no-recruitment"
  | "no-compliance-issues"
  | "no-payroll"
  | "no-report-data"
  // Request states
  | "loading"
  | "error"
  | "restricted";

export const PROTOTYPE_MODES: { value: PrototypeMode; label: string }[] = [
  { value: "active", label: "Active client" },
  { value: "new-client", label: "New client (onboarding)" },
  { value: "invitation-required", label: "Invitation required" },
  { value: "invitation-expired", label: "Invitation expired" },
  { value: "invitation-invalid", label: "Invitation invalid / revoked" },
  { value: "invitation-used", label: "Invitation already used" },
  { value: "suspended", label: "Account suspended" },
  { value: "no-client-access", label: "No Client access" },
  { value: "wrong-portal", label: "Wrong portal" },
  { value: "no-outlets", label: "No outlets assigned" },
  { value: "no-workforce", label: "Fresh account (no workforce yet)" },
  { value: "no-attendance", label: "No attendance records" },
  { value: "no-schedule", label: "No schedule" },
  { value: "no-candidates", label: "No candidates to review" },
  { value: "no-recruitment", label: "No recruitment activity" },
  { value: "no-compliance-issues", label: "No compliance issues" },
  { value: "no-payroll", label: "No payroll schedule" },
  { value: "no-report-data", label: "No report data for period" },
  { value: "loading", label: "Loading (skeleton)" },
  { value: "error", label: "Error + retry" },
  { value: "restricted", label: "Restricted (unauthorised)" },
];

let mode: PrototypeMode = "active";
const listeners = new Set<() => void>();

export function getPrototypeMode(): PrototypeMode {
  return mode;
}
export function setPrototypeMode(next: PrototypeMode) {
  if (next === mode) return;
  mode = next;
  listeners.forEach((l) => l());
}
export function subscribePrototypeMode(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function usePrototypeMode(): PrototypeMode {
  return useSyncExternalStore(subscribePrototypeMode, getPrototypeMode, () => "active");
}
