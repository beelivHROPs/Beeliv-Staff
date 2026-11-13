/**
 * Jobs a signed-OUT visitor saved on the public site (FRONTEND MOCK).
 *
 * Persisted in this browser's localStorage so a refresh does not forget them, and merged into the person's
 * saved jobs the first time the Applicant app loads after sign-in (lib/applicant/saved.ts calls
 * `takeGuestSavedJobs`). In this prototype both apps share one origin, so the browser storage is enough.
 * In production the public site (beeliv.co) and the Talent app (talent.beeliv.co) are different origins:
 * the saved ids must travel with the sign-up/login hand-off and be merged server-side (backend need).
 * Every storage call is try/catch: private mode or blocked storage just keeps the list in memory.
 */
import { useEffect, useSyncExternalStore } from "react";

export const GUEST_SAVED_KEY = "beeliv-guest-saved-jobs-v1";
let saved: string[] = [];
let hydrated = false;
const listeners = new Set<() => void>();
const NONE: string[] = [];

const emit = () => listeners.forEach((l) => l());

function readStored(): string[] {
  try {
    const raw = window.localStorage.getItem(GUEST_SAVED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const stored = readStored();
  if (stored.length) {
    saved = stored;
    emit();
  }
}

export function useGuestSavedJobs(): string[] {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => saved,
    () => NONE,
  );
  useEffect(hydrate, []);
  return snap;
}

/** Toggle one job. Returns the new state (true = now saved). */
export function toggleGuestSavedJob(jobId: string): boolean {
  hydrate();
  const was = saved.includes(jobId);
  saved = was ? saved.filter((id) => id !== jobId) : [jobId, ...saved];
  try {
    window.localStorage.setItem(GUEST_SAVED_KEY, JSON.stringify(saved));
  } catch {
    /* keep in memory */
  }
  emit();
  return !was;
}

/** Returns the visitor's saved ids and clears them (called once, after sign-in, to merge into the account). */
export function takeGuestSavedJobs(): string[] {
  if (typeof window === "undefined") return [];
  const ids = readStored();
  try {
    window.localStorage.removeItem(GUEST_SAVED_KEY);
  } catch {
    /* nothing to clear */
  }
  saved = [];
  return ids;
}
