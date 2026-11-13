"use client";

/**
 * Staff Hub handover (locked transition, docs/requirements/beeliv-applicant-
 * to-staff-transition-2026-09-29.md): ONE user — staff access is added to the
 * same account. Applicant and Staff are ONE Talent app on talent.beeliv.co with
 * one login/session (docs/requirements/beeliv-talent-platform-architecture-
 * 2026-09-29.md), so opening the Staff Hub needs no sign-in.
 * This store only tracks the applicant's progress through the guided setup
 * on this device (the Staff Hub itself isn't built yet — Stage 2B).
 */
import { useSyncExternalStore } from "react";

/** Same app, same session: the Staff experience lives at /staff. */
export const STAFF_HUB_URL = process.env.NEXT_PUBLIC_STAFF_HUB_URL ?? "/staff";
export const STAFF_HUB_HOST = "talent.beeliv.co";

export type SetupStep = "open" | "save";
export type StaffHubSetup = Record<SetupStep, boolean> & { celebrated: boolean };

const KEY = "beeliv-staff-hub-setup-v1";
const EMPTY: StaffHubSetup = { open: false, save: false, celebrated: false };

let state: StaffHubSetup = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as Partial<StaffHubSetup>) };
  } catch {
    // storage unavailable — keep defaults
  }
}

function set(next: StaffHubSetup) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — in-memory only
  }
  listeners.forEach((l) => l());
}

export function useStaffHubSetup(): StaffHubSetup {
  return useSyncExternalStore(
    (cb) => {
      hydrate();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      hydrate();
      return state;
    },
    () => EMPTY,
  );
}

export function setSetupStep(step: SetupStep, done: boolean) {
  set({ ...state, [step]: done });
}

export function markCelebrated() {
  if (!state.celebrated) set({ ...state, celebrated: true });
}

/** Clears progress (used when the prototype state is switched). */
export function resetStaffHubSetup() {
  set(EMPTY);
}

export const SETUP_STEPS: SetupStep[] = ["open", "save"];
export const SETUP_TOTAL = SETUP_STEPS.length;
export function setupDone(s: StaffHubSetup): number {
  return SETUP_STEPS.filter((k) => s[k]).length;
}
