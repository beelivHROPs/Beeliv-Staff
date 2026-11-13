"use client";

/**
 * DEV ONLY - the "Prototype state" control (mirrors the Applicant shell's
 * mode switcher). It picks which development-fixture scenario the mock
 * adapter serves. Delete this file, the pill in StaffShell and the mock
 * adapter when the real backend adapter goes in.
 */
import { useSyncExternalStore } from "react";

export type PrototypeMode =
  | "active"
  | "no-shift"
  | "onboarding"
  | "no-assignment"
  | "invitation-required"
  | "invitation-expired"
  | "suspended"
  | "no-entitlement"
  | "loading"
  | "error";

export const PROTOTYPE_MODES: { value: PrototypeMode; label: string }[] = [
  { value: "active", label: "Active staff" },
  { value: "no-shift", label: "No shift today" },
  { value: "onboarding", label: "New staff (onboarding)" },
  { value: "no-assignment", label: "No assignment" },
  { value: "invitation-required", label: "Invitation required" },
  { value: "invitation-expired", label: "Invitation expired" },
  { value: "suspended", label: "Account suspended" },
  { value: "no-entitlement", label: "No staff access yet" },
  { value: "loading", label: "Loading (skeleton)" },
  { value: "error", label: "Error + retry" },
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
